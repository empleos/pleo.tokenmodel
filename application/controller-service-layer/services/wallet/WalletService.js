const nem = require('nem-sdk').default;
const kms = require('../AWS/KMSService');
const nemService = require('./common');
const uuid = require('node-uuid');
const { humanize } = require('underscore.string');

module.exports = (function () {
    const checkBalance = async (req, res, callback) => {
        try {
            const balanceRes = await nemService.xemBalance(req.query.walletaddress);

            const balance = balanceRes.balance / process.env.XEM_DIVISIBILITY;

            return callback(null, { balance });
        } catch (err) {
            return callback(err);
        }
    };

    const mosaicBalance = async (req, res, callback) => {
        try {
            const balanceRes = await nemService.pleoBalance(req.query.walletaddress);

            const balance = balanceRes.balance / process.env.PLEO_DIVISIBILITY;

            return callback(null, { balance });
        } catch (err) {
            return callback(err);
        }
    };

    const tokenTransfer = async (req, res, callback) => {
        try {
            const privateKey = req.body.privatekey;
            const recipient = req.body.recipient;
            const amount = req.body.amount;
            const message = req.body.message;

            // endpoint initialisation
            const endpoint = nem.model.objects.create('endpoint')(process.env.NIS_URL, process.env.NIS_PORT);

            // transaction common data initialisation
            const common = nem.model.objects.get('common');
            common.privateKey = privateKey;

            // create transfer transaction object
            const transferTransaction = nem.model.objects.create('transferTransaction')(recipient, amount, message);

            // prepare transaction
            const transactionEntity = nem.model.transactions.prepare('transferTransaction')(common, transferTransaction, nem.model.network.data.testnet.id);

            //Overwriting timestamp and deadline
            const time = await nem.com.requests.chain.time(endpoint);            
            let ts=Math.floor(time.receiveTimeStamp/1000);
            transactionEntity.timeStamp=ts;
            let due = 60;
            transactionEntity.deadline=ts + due * 60;

            // sign and send to NIS
            const result = await nem.model.transactions.send(common, transactionEntity, endpoint);

            return callback(null, result);
        } catch (err) {
            return callback(err);
        }
    };

    const createWallet = async (req, res, callback) => {
        try {
            // Set a wallet name
            const walletName = uuid.v1();

            // Set a password
            const password = uuid.v1();

            // Create PRNG wallet
            const wallet = await nem.model.wallet.createPRNG(walletName, password, nem.model.network.data.testnet.id);

            const common = nem.model.objects.create('common')(password, '');

            // Get the wallet account to decrypt
            const walletAccount = wallet.accounts[0];

            const algo = wallet.accounts[0].algo;

            // Decrypt account private key
            await nem.crypto.helpers.passwordToPrivatekey(common, walletAccount, algo);

            // Log the response
            await domain.NemLog.createLog({
                type: 'CREATE_WALLET',
                fromUserId: req.loggedInUser.id,
                response: wallet,
                status: 'SUCCESS',
            });

            const encryptedPrivateKey = await kms.encrypt(common.privateKey);

            const encryptedWalletPassword = await kms.encrypt(password);

            return callback(null, {
                walletAddress: wallet.accounts[0].address,
                privateKey: encryptedPrivateKey,
                walletName,
                walletPassword: encryptedWalletPassword,
            });
        } catch (err) {
            // Log the response
            await domain.NemLog.createLog({
                type: 'CREATE_WALLET',
                fromUserId: req.loggedInUser.id,
                response: err,
                status: 'ERR_FAILED',
            });
            return callback(err);
        }
    };

    const decryptWallet = async (req, res, callback) => {
        try {
            // const common = nem.model.objects.create("common")("pulkit", "");

            // // Get the wallet account to decrypt
            // const walletAccount = wallet.accounts[index];

            // // Decrypt account private key
            // nem.crypto.helpers.passwordToPrivatekey(common, walletAccount, wallet.algo);

            // return callback(null, common);

        } catch (err) {
            return callback(err);
        }
    };

    const linkWallet = async (req, res, callback) => {
        try {
            const address = req.body.walletAddress;

            const isValid = await nem.model.address.isValid(address);

            if (!isValid) throw new Error('Wallet address is invalid');

            const isFromNetwork = await nem.model.address.isFromNetwork(address, nem.model.network.data.testnet.id);

            if (!isFromNetwork) throw new Error('Wallet address is invalid');

            // Log the response
            await domain.NemLog.createLog({
                type: 'LINK_WALLET',
                fromUserId: req.loggedInUser.id,
                response: isFromNetwork,
                status: 'SUCCESS',
            });

            return callback(null, {
                message: 'wallet address is valid',
            });
        } catch (err) {
            // Log the response
            await domain.NemLog.createLog({
                type: 'LINK_WALLET',
                fromUserId: req.loggedInUser.id,
                response: err,
                status: 'ERR_FAILED',
            });

            return callback(err);
        }
    };

    const mosaicTransfer = async (req, res, callback) => {
        try {
            const privateKey = await kms.decrypt(req.loggedInUser.privateKey);
            const recipient = process.env.PLEO_RECEPIENT_WALLET_ADDRESS;

            const pleoBalanceRes = await nemService.pleoBalance(req.loggedInUser.walletAddress);

            const currentPleoBalance = pleoBalanceRes.balance / process.env.PLEO_DIVISIBILITY;

            if (pleoBalanceRes.balance < process.env.PURCHASE_PROFILE_FEES) {
                throw new Error('Insuffcient Balance');
            }

            const result = await nemService.pleoTransfer(privateKey, recipient, process.env.PURCHASE_PROFILE_FEES);

            if (result.tranferRes.code !== 1) {
                result.message = humanize(result.tranferRes.message);
                result.type = 'PLEO_TRANSACTION';
                result.fromUserId = req.loggedInUser.id;
                result.toUserId = null;
                result.fromWalletId = req.loggedInUser.walletAddress;
                result.toWalletId = recipient;
                throw result;
            }

            const balanceRes = await nemService.xemBalance(req.loggedInUser.walletAddress);

            const currentBalance = balanceRes.balance / process.env.XEM_DIVISIBILITY;

            if (currentBalance < process.env.CHECK_EMPLOYER_BALANCE) {
                const maintainXEM = process.env.EMPLOYER_XEM_BALANCE / process.env.XEM_DIVISIBILITY;
                const transferableXem = maintainXEM - currentBalance;

                const xemResult = await nemService.xemTransfer(process.env.EMPLEOS_PRIVATE_KEY, req.loggedInUser.walletAddress, transferableXem);

                if (xemResult.tranferRes.code !== 1) {
                    xemResult.message = humanize(xemResult.tranferRes.message);
                    xemResult.type = 'EMPLOYER_MAINTAIN_BALANCE_TRANSFER';
                    xemResult.fromUserId = null;
                    xemResult.toUserId = req.loggedInUser.id;
                    xemResult.fromWalletId = process.env.EMPLEOS_WALLET_ADDRESS;
                    xemResult.toWalletId = req.loggedInUser.walletAddress;
                    throw xemResult;
                }
                const networkFee = xemResult.transactionEntity.fee / process.env.XEM_DIVISIBILITY;
                await domain.NemLog.createLog({
                    type: 'EMPLOYER_MAINTAIN_BALANCE_TRANSFER',
                    toUserId: req.loggedInUser.id,
                    fromWalletId: process.env.EMPLEOS_WALLET_ADDRESS,
                    toWalletId: req.loggedInUser.walletAddress,
                    xemTransacted: transferableXem,
                    networkFee,
                    response: xemResult,
                    status: 'SUCCESS',
                });
            }

            const pleoTransacted = process.env.PURCHASE_PROFILE_FEES / process.env.PLEO_DIVISIBILITY;

            const networkFee = result.transactionEntity.fee / process.env.XEM_DIVISIBILITY;

            // Log the response
            await domain.NemLog.createLog({
                type: 'PLEO_TRANSACTION',
                fromUserId: req.loggedInUser.id,
                fromWalletId: req.loggedInUser.walletAddress,
                toWalletId: process.env.PLEO_RECEPIENT_WALLET_ADDRESS,
                pleoTransacted,
                networkFee,
                response: result,
                status: 'SUCCESS',
            });

            return callback(null, {
                message: 'Successfully transfered token',
            });
        } catch (err) {
            // Log the response
            await domain.NemLog.createLog({
                type: err.type,
                fromUserId: err.fromUserId,
                toUserId: err.toUserId,
                fromWalletId: err.fromWalletId,
                toWalletId: err.toWalletId,
                response: err,
                status: 'ERR_FAILED',
            });

            return callback({
                message: err.message,
            });
        }
    };

    const mosaicXemTransfer = async (req, res, callback) => {
        try {
            const privateKey = process.env.EMPLEOS_PRIVATE_KEY;
            const recipient = req.loggedInUser.walletAddress;
            const amount = 1;
            const message = 'Create wallet free XEM and Pleo';

            // endpoint initialisation
            const endpoint = nem.model.objects.create('endpoint')(process.env.NIS_URL, process.env.NIS_PORT);

            // transaction common data initialisation
            const common = nem.model.objects.get('common');
            common.privateKey = privateKey;

            // Create variable to store our mosaic definitions, needed to calculate fees properly (already contains xem definition)
            const mosaicDefinitionMetaDataPair = nem.model.objects.get('mosaicDefinitionMetaDataPair');

            // create transfer transaction object
            const transferTransaction = nem.model.objects.create('transferTransaction')(recipient, amount, message);

            // Create a XEM attachment object
            const xemAttachment = nem.model.objects.create('mosaicAttachment')('nem', 'xem', process.env.CREATE_WALLET_FREE_XEM); // divisibility is 6 for this mosaic

            // Push attachment into transaction mosaics
            transferTransaction.mosaics.push(xemAttachment);

            // Create another mosaic attachment
            const mosaicAttachment = nem.model.objects.create('mosaicAttachment')('empleosdev', 'pleo', process.env.CREATE_WALLET_FREE_PLEO); // divisibility is 3 for this mosaic

            // Push attachment into transaction mosaics
            transferTransaction.mosaics.push(mosaicAttachment);

            // Getting XEM definitions
            const xemSpply = await nem.com.requests.mosaic.supply(endpoint, nem.utils.format.mosaicIdToName(xemAttachment.mosaicId));

            mosaicDefinitionMetaDataPair[nem.utils.format.mosaicIdToName(xemAttachment.mosaicId)].supply = xemSpply.supply;

            const res = await nem.com.requests.namespace.mosaicDefinitions(endpoint, mosaicAttachment.mosaicId.namespaceId);

            // Look for the mosaic definition(s) we want in the request response
            const neededDefinition = nem.utils.helpers.searchMosaicDefinitionArray(res.data, ['pleo']);

            // Get full name of mosaic to use as object key
            const fullMosaicName = nem.utils.format.mosaicIdToName(mosaicAttachment.mosaicId);

            // Check if the mosaic was found
            if (undefined === neededDefinition[fullMosaicName]) {
                return console.error('Mosaic not found !');
            }

            // Set pleo mosaic definition into mosaicDefinitionMetaDataPair
            mosaicDefinitionMetaDataPair[fullMosaicName] = {};
            mosaicDefinitionMetaDataPair[fullMosaicName].mosaicDefinition = neededDefinition[fullMosaicName];

            // Get current supply with eur:usd
            const resSupply = await nem.com.requests.mosaic.supply(endpoint, fullMosaicName);
            mosaicDefinitionMetaDataPair[fullMosaicName].supply = resSupply.supply;

            // Prepare the transfer transaction object
            const transactionEntity = nem.model.transactions.prepare('mosaicTransferTransaction')(common, transferTransaction, mosaicDefinitionMetaDataPair, nem.model.network.data.testnet.id);

            //Overwriting timestamp and deadline
            const time = await nem.com.requests.chain.time(endpoint);            
            let ts=Math.floor(time.receiveTimeStamp/1000);
            transactionEntity.timeStamp=ts;
            let due = 60;
            transactionEntity.deadline=ts + due * 60;
;
            // Serialize transfer transaction and announce
            const result = await nem.model.transactions.send(common, transactionEntity, endpoint);

            if (result.code !== 1) throw result;

            const xemTransacted = process.env.CREATE_WALLET_FREE_XEM / process.env.XEM_DIVISIBILITY;

            const pleoTransacted = process.env.CREATE_WALLET_FREE_PLEO / process.env.PLEO_DIVISIBILITY;

            const networkFee = transactionEntity.fee / process.env.XEM_DIVISIBILITY;

            // Log the response
            await domain.NemLog.createLog({
                type: 'PLEO_XEM_TRANSACTION',
                toUserId: req.loggedInUser.id,
                fromWalletId: process.env.EMPLEOS_WALLET_ADDRESS,
                toWalletId: req.loggedInUser.walletAddress,
                xemTransacted,
                pleoTransacted,
                networkFee,
                response: result,
                status: 'SUCCESS',
            });

            return callback(null, {
                message: 'Successfully transfered token',
            });
        } catch (err) {
            // Log the response
            await domain.NemLog.createLog({
                type: 'PLEO_XEM_TRANSACTION',
                toUserId: req.loggedInUser.id,
                toWalletId: req.loggedInUser.walletAddress,
                response: err,
                status: 'ERR_FAILED',
            });

            return callback({
                message: err.message,
            });
        }
    };

    const candidatePleoTransfer = async (toWalletAddress, pleoAmount, toUserId) => {
        try {
            const privateKey = process.env.EMPLEOS_PRIVATE_KEY;
            const recipient = toWalletAddress;
            const amount = 1; //This is just to calculate the fee.
            const message = 'Candidate transfer';
            const pleoAmountToBeTranfer = pleoAmount * process.env.PLEO_DIVISIBILITY;

            // endpoint initialisation
            const endpoint = nem.model.objects.create('endpoint')(process.env.NIS_URL, process.env.NIS_PORT);

            // transaction common data initialisation
            const common = nem.model.objects.get('common');
            common.privateKey = privateKey;

            // Create variable to store our mosaic definitions, needed to calculate fees properly (already contains xem definition)
            const mosaicDefinitionMetaDataPair = nem.model.objects.get('mosaicDefinitionMetaDataPair');

            // create transfer transaction object
            const transferTransaction = nem.model.objects.create('transferTransaction')(recipient, amount, message);

            // Create a mosaic attachment object

            // Create another mosaic attachment
            const mosaicAttachment = nem.model.objects.create('mosaicAttachment')('empleosdev', 'pleo', pleoAmountToBeTranfer); // 1 empleosdev.pleo (divisibility is 3 for this mosaic)

            // Push attachment into transaction mosaics
            transferTransaction.mosaics.push(mosaicAttachment);

            const res = await nem.com.requests.namespace.mosaicDefinitions(endpoint, mosaicAttachment.mosaicId.namespaceId);

            // Look for the mosaic definition(s) we want in the request response
            const neededDefinition = nem.utils.helpers.searchMosaicDefinitionArray(res.data, ['pleo']);

            // Get full name of mosaic to use as object key
            const fullMosaicName = nem.utils.format.mosaicIdToName(mosaicAttachment.mosaicId);

            // Check if the mosaic was found
            if (undefined === neededDefinition[fullMosaicName]) {
                return console.error('Mosaic not found !');
            }

            // Set pleo mosaic definition into mosaicDefinitionMetaDataPair
            mosaicDefinitionMetaDataPair[fullMosaicName] = {};
            mosaicDefinitionMetaDataPair[fullMosaicName].mosaicDefinition = neededDefinition[fullMosaicName];

            // Get current supply with eur:usd
            const resSupply = await nem.com.requests.mosaic.supply(endpoint, fullMosaicName);
            mosaicDefinitionMetaDataPair[fullMosaicName].supply = resSupply.supply;

            // Prepare the transfer transaction object
            const transactionEntity = nem.model.transactions.prepare('mosaicTransferTransaction')(common, transferTransaction, mosaicDefinitionMetaDataPair, nem.model.network.data.testnet.id);
            
            //Overwriting timestamp and deadline
            const time = await nem.com.requests.chain.time(endpoint);            
            let ts=Math.floor(time.receiveTimeStamp/1000);
            transactionEntity.timeStamp=ts;
            let due = 60;
            transactionEntity.deadline=ts + due * 60;

            // Serialize transfer transaction and announce
            const result = await nem.model.transactions.send(common, transactionEntity, endpoint);

            if (result.code !== 1) throw result;

            // const pleoTransacted = process.env.PURCHASE_PROFILE_FEES / process.env.PLEO_DIVISIBILITY;

            const networkFee = transactionEntity.fee / process.env.XEM_DIVISIBILITY;

            // Log the response
            await domain.NemLog.createLog({
                type: 'CANDIDATE_TRANSFER_TRANSACTION',
                toUserId,
                fromWalletId: process.env.EMPLEOS_WALLET_ADDRESS,
                toWalletId: toWalletAddress,
                pleoTransacted: pleoAmount,
                networkFee,
                response: result,
                status: 'SUCCESS',
            });

            return Promise.resolve('Success');
        } catch (err) {
            // Log the response
            await domain.NemLog.createLog({
                type: 'CANDIDATE_TRANSFER_TRANSACTION',
                toUserId,
                fromWalletId: process.env.EMPLEOS_WALLET_ADDRESS,
                toWalletId: toWalletAddress,
                response: err,
                status: 'ERR_FAILED',
            });
            return Promise.reject(err);
        }
    };

    const transferPleoToOtherWallet = async (req, res, callback) => {
        try {
            const privateKey = await kms.decrypt(req.loggedInUser.privateKey);
            const recipient = req.body.walletAddress;
            const amount = req.body.amount;
            const transferableAmount = amount * process.env.PLEO_DIVISIBILITY;
            let result = {};

            const balanceRes = await nemService.pleoBalance(req.loggedInUser.walletAddress);

            const currentBalance = balanceRes.balance / process.env.PLEO_DIVISIBILITY;

            if (req.loggedInUser.userType === 'employer') {
                const reserveAmount = currentBalance - amount;
                if (reserveAmount >= process.env.EMPLOYER_MIN_WALLET_BALANCE) {
                    result = await nemService.pleoTransfer(privateKey, recipient, transferableAmount);
                    if (result.tranferRes.code !== 1) {
                        result.message = humanize(result.tranferRes.message);
                        result.type = 'OTHER_WALLET_TRANSFER_TRANSACTION';
                        result.fromUserId = req.loggedInUser.id;
                        result.toUserId = null;
                        result.fromWalletId = req.loggedInUser.walletAddress;
                        result.toWalletId = recipient;
                        throw result;
                    }
                } else {
                    result.message = 'Insufficient Balance';
                    result.type = 'OTHER_WALLET_TRANSFER_TRANSACTION';
                    result.fromUserId = req.loggedInUser.id;
                    result.toUserId = null;
                    result.fromWalletId = req.loggedInUser.walletAddress;
                    result.toWalletId = recipient;
                    throw result;
                }
            } else if (req.loggedInUser.userType === 'candidate') {
                if (currentBalance >= amount) {
                    result = await nemService.pleoTransfer(privateKey, recipient, transferableAmount);
                    if (result.tranferRes.code !== 1) {
                        result.message = humanize(result.tranferRes.message);
                        result.type = 'OTHER_WALLET_TRANSFER_TRANSACTION';
                        result.fromUserId = req.loggedInUser.id;
                        result.toUserId = null;
                        result.fromWalletId = req.loggedInUser.walletAddress;
                        result.toWalletId = recipient;
                        throw result;
                    }

                    const xemBalanceRes = await nemService.xemBalance(req.loggedInUser.walletAddress);
                    const xemBalance = xemBalanceRes.balance / process.env.XEM_DIVISIBILITY;

                    if (xemBalance < process.env.CHECK_CANDIDATE_BALANCE) {
                        const maintainXEM = process.env.CANDIDATE_XEM_BALANCE / process.env.XEM_DIVISIBILITY;
                        const transferableXem = maintainXEM - xemBalance;
                        const xemResult = await nemService.xemTransfer(process.env.EMPLEOS_PRIVATE_KEY, req.loggedInUser.walletAddress, transferableXem);
                        if (xemResult.tranferRes.code !== 1) {
                            xemResult.message = humanize(xemResult.tranferRes.message);
                            xemResult.type = 'CANDIDATE_MAINTAIN_BALANCE_TRANSFER';
                            xemResult.fromUserId = null;
                            xemResult.toUserId = req.loggedInUser.id;
                            xemResult.fromWalletId = process.env.EMPLEOS_WALLET_ADDRESS;
                            xemResult.toWalletId = req.loggedInUser.walletAddress;
                            throw xemResult;
                        }
                        const networkFee = xemResult.transactionEntity.fee / process.env.XEM_DIVISIBILITY;
                        await domain.NemLog.createLog({
                            type: 'CANDIDATE_MAINTAIN_BALANCE_TRANSFER',
                            toUserId: req.loggedInUser.id,
                            fromWalletId: process.env.EMPLEOS_WALLET_ADDRESS,
                            toWalletId: req.loggedInUser.walletAddress,
                            xemTransacted: transferableXem,
                            networkFee,
                            response: xemResult,
                            status: 'SUCCESS',
                        });
                    }
                } else {
                    result.message = 'Insufficient Balance';
                    result.type = 'OTHER_WALLET_TRANSFER_TRANSACTION';
                    result.fromUserId = req.loggedInUser.id;
                    result.toUserId = null;
                    result.fromWalletId = req.loggedInUser.walletAddress;
                    result.toWalletId = recipient;
                    throw result;
                }
            } else {
                result.message = 'INAVLID_CALL';
                result.type = 'OTHER_WALLET_TRANSFER_TRANSACTION';
                result.fromUserId = req.loggedInUser.id;
                result.toUserId = null;
                result.fromWalletId = req.loggedInUser.walletAddress;
                result.toWalletId = recipient;
                throw result;
            }
            const networkFee = result.transactionEntity.fee / process.env.XEM_DIVISIBILITY;

            // Log the response
            await domain.NemLog.createLog({
                type: 'OTHER_WALLET_TRANSFER_TRANSACTION',
                fromUserId: req.loggedInUser.id,
                fromWalletId: req.loggedInUser.walletAddress,
                toWalletId: recipient,
                pleoTransacted: amount,
                networkFee,
                response: result,
                status: 'SUCCESS',
            });

            return callback(null, {
                message: 'Successfully transfered token',
            });
        } catch (err) {
            // Log the response
            await domain.NemLog.createLog({
                type: err.type,
                fromUserId: err.fromUserId,
                toUserId: err.toUserId,
                fromWalletId: err.fromWalletId,
                toWalletId: err.toWalletId,
                response: err,
                status: 'ERR_FAILED',
            });

            return callback({
                message: err.message,
            });
        }
    };

    const xemTransferToCandidate = async (req, res, callback) => {
        try {
            const privateKey = process.env.EMPLEOS_PRIVATE_KEY;
            const recipient = req.loggedInUser.walletAddress;
            const amount = process.env.CREATE_WALLET_FREE_CANDIDATE_XEM / process.env.XEM_DIVISIBILITY;

            const result = await nemService.xemTransfer(privateKey, recipient, amount);

            if (result.tranferRes.code !== 1) {
                result.message = humanize(result.tranferRes.message);
                throw result;
            }

            const networkFee = result.transactionEntity.fee / process.env.XEM_DIVISIBILITY;

            // Log the response
            await domain.NemLog.createLog({
                type: 'CREATE_WALLET_CANDIDATE_TRANSFER',
                toUserId: req.loggedInUser.id,
                fromWalletId: process.env.EMPLEOS_WALLET_ADDRESS,
                toWalletId: recipient,
                xemTransacted: amount,
                networkFee,
                response: result,
                status: 'SUCCESS',
            });

            return callback(null, {
                message: 'Successfully transfered token',
            });
        } catch (err) {
            // Log the response
            await domain.NemLog.createLog({
                type: 'CREATE_WALLET_CANDIDATE_TRANSFER',
                toUserId: req.loggedInUser.id,
                fromWalletId: process.env.EMPLEOS_WALLET_ADDRESS,
                toWalletId: req.loggedInUser.walletAddress,
                response: err,
                status: 'ERR_FAILED',
            });

            return callback({
                message: err.message,
            });
        }
    };

    const transferPleoXemToEmpleos = async (req, res, callback) => {
        try {
            const privateKey = await kms.decrypt(req.loggedInUser.privateKey);
            const fromWalletAddress = req.loggedInUser.walletAddress;
            const recipient = process.env.EMPLEOS_WALLET_ADDRESS;
            let xemQuantity = 0;
            let pleoQuantity = 0;
            let networkFee = 0;
            let result = {};

            const xemBal = await nemService.xemBalance(req.loggedInUser.walletAddress);
            xemQuantity = xemBal.balance / process.env.XEM_DIVISIBILITY;

            const pleoBal = await nemService.pleoBalance(fromWalletAddress);
            pleoQuantity = pleoBal.balance / process.env.PLEO_DIVISIBILITY;
            if (xemQuantity > 0) {
                const { fee } = await nemService.calculateFees(privateKey, recipient, xemQuantity, pleoQuantity);
                networkFee = fee / process.env.XEM_DIVISIBILITY;
                if (fee >= xemQuantity) {
                    xemQuantity = xemQuantity - (fee / process.env.XEM_DIVISIBILITY);
                    result = await nemService.xemPleoTransfer(privateKey, recipient, xemQuantity, pleoQuantity);
                    if (result.tranferRes.code !== 1) {
                        result.message = humanize(result.tranferRes.message);
                         throw result;
                    }
                }
            }

            // Log the response
            await domain.NemLog.createLog({
                type: 'PLEO_XEM_TO_EMPLEOS_TRANSACTION',
                fromUserId: req.loggedInUser.id,
                fromWalletId: req.loggedInUser.walletAddress,
                toWalletId: process.env.EMPLEOS_WALLET_ADDRESS,
                xemTransacted: xemQuantity,
                pleoTransacted: pleoQuantity,
                networkFee,
                response: result,
                status: 'SUCCESS',
            });
            console.log('result', result);
            return callback(null, {
                message: 'Successfully transfered token',
            });
        } catch (err) {
            console.log('err', err);
            // Log the response
            await domain.NemLog.createLog({
                type: 'PLEO_XEM_TO_EMPLEOS_TRANSACTION',
                fromUserId: req.loggedInUser.id,
                fromWalletId: req.loggedInUser.walletAddress,
                toWalletId: req.loggedInUser.walletAddress,
                response: err,
                status: 'ERR_FAILED',
            });

            return callback({
                message: err.message,
            });
        }
    };

    return {
        checkBalance,
        mosaicBalance,
        tokenTransfer,
        createWallet,
        decryptWallet,
        linkWallet,
        mosaicTransfer,
        mosaicXemTransfer,
        candidatePleoTransfer,
        transferPleoToOtherWallet,
        xemTransferToCandidate,
        transferPleoXemToEmpleos,
    };
}());

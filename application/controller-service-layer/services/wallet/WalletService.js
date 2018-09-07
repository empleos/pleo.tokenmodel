const request = require('request-promise');
const nem = require('nem-sdk').default;
const kms = require('../AWS/KMSService');

module.exports = (function () {
    const checkBalance = async (req, res, callback) => {
        try {
            const options = {
                method: 'GET',
                url: `${process.env.NIS_HOST}/account/get`,
                qs: { address: req.query.walletaddress },
            };

            const result = await request(options);

            return callback(null, JSON.parse(result));
        } catch (err) {
            return callback(err);
        }
    };

    const mosaicBalance = async (req, res, callback) => {
        try {
            let balance = 0;

            const options = {
                method: 'GET',
                url: `${process.env.NIS_HOST}/account/mosaic/owned`,
                qs: { address: req.query.walletaddress },
            };

            const result = await request(options);

            const resultJson = JSON.parse(result);

            resultJson.data.forEach((row) => {
                if (row.mosaicId.namespaceId == process.env.NAMESPACE_ID && row.mosaicId.name == process.env.MOSAIC_NAME) {
                    balance = row.quantity;
                }
            });

            balance /= process.env.PLEO_DIVISIBILITY;

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
            const walletName = req.body.walletName;

            // Set a password
            const password = req.body.walletPassword;

            // Create PRNG wallet
            const wallet = await nem.model.wallet.createPRNG(walletName, password, nem.model.network.data.testnet.id);

            const common = nem.model.objects.create('common')(password, '');

            // Get the wallet account to decrypt
            const walletAccount = wallet.accounts[0];

            const algo = wallet.accounts[0].algo;

            // Decrypt account private key
            await nem.crypto.helpers.passwordToPrivatekey(common, walletAccount, algo);

            // Log the response
            await domain.NemLog.create({
                type: 'CREATE_WALLET',
                fromUserId: req.loggedInUser.id,
                response: wallet,
                status: 'SUCCESS',
            });

            const encryptedPrivateKey = await kms.encrypt(common.privateKey);

            return callback(null, {
                walletAddress: wallet.accounts[0].address,
                privateKey: encryptedPrivateKey,
            });
        } catch (err) {
            // Log the response
            await domain.NemLog.create({
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
            await domain.NemLog.create({
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
            await domain.NemLog.create({
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
            const amount = 1;
            const message = '1 pleo transfer';

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
            const mosaicAttachment = nem.model.objects.create('mosaicAttachment')('empleosdev', 'pleo', process.env.PURCHASE_PROFILE_FEES); // 1 empleosdev.pleo (divisibility is 3 for this mosaic)

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

            // Serialize transfer transaction and announce
            const result = await nem.model.transactions.send(common, transactionEntity, endpoint);

            if (result.code !== 1) throw result;

            const pleoTransacted = process.env.PURCHASE_PROFILE_FEES / process.env.PLEO_DIVISIBILITY;

            const networkFee = transactionEntity.fee / process.env.XEM_DIVISIBILITY;

            // Log the response
            await domain.NemLog.create({
                type: 'PLEO_TRANSACTION',
                fromUserId: req.loggedInUser.id,
                // toUserId: req.body.recipientUserId,
                fromWalletId: req.loggedInUser.walletAddress,
                toWalletId: process.env.PLEO_RECEPIENT_WALLET_ADDRESS,
                pleoTransacted: pleoTransacted,
                networkFee: networkFee,
                response: result,
                status: 'SUCCESS',
            });

            return callback(null, {
                message: 'Successfully transfered token',
            });
        } catch (err) {
            // Log the response
            await domain.NemLog.create({
                type: 'PLEO_TRANSACTION',
                fromUserId: req.loggedInUser.id,
                fromWalletId: req.loggedInUser.walletAddress,
                toWalletId: process.env.PLEO_RECEPIENT_WALLET_ADDRESS,
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
            const xemAttachment = nem.model.objects.create("mosaicAttachment")("nem", "xem", process.env.CREATE_WALLET_FREE_XEM); // divisibility is 6 for this mosaic

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

            // Serialize transfer transaction and announce
            const result = await nem.model.transactions.send(common, transactionEntity, endpoint);

            if (result.code !== 1) throw result;

            const xemTransacted = process.env.CREATE_WALLET_FREE_XEM / process.env.XEM_DIVISIBILITY;

            const pleoTransacted = process.env.CREATE_WALLET_FREE_PLEO / process.env.PLEO_DIVISIBILITY;

            const networkFee = transactionEntity.fee / process.env.XEM_DIVISIBILITY;

            // Log the response
            await domain.NemLog.create({
                type: 'PLEO_XEM_TRANSACTION',
                toUserId: req.loggedInUser.id,
                fromWalletId: process.env.EMPLEOS_WALLET_ADDRESS,
                toWalletId: req.loggedInUser.walletAddress,
                xemTransacted: xemTransacted,
                pleoTransacted: pleoTransacted,
                networkFee: networkFee,
                response: result,
                status: 'SUCCESS',
            });

            return callback(null, {
                message: 'Successfully transfered token',
            });
        } catch (err) {
            // Log the response
            await domain.NemLog.create({
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

    return {
        checkBalance,
        mosaicBalance,
        tokenTransfer,
        createWallet,
        decryptWallet,
        linkWallet,
        mosaicTransfer,
        mosaicXemTransfer,
    };
}());

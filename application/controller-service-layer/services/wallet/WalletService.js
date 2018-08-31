const request = require('request-promise');
const nem = require('nem-sdk').default;

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
            if (global.Raven) global.Raven.captureException(JSON.stringify(err));
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
            if (global.Raven) global.Raven.captureException(JSON.stringify(err));
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

            return callback(null, {
                walletAddress: wallet.accounts[0].address,
                privateKey: common.privateKey,
            });
        } catch (err) {
            if (global.Raven) global.Raven.captureException(JSON.stringify(err));
            return callback(err);
        }
    };

    const decryptWallet = async (req, res, callback) => {
        try {
            const common = nem.model.objects.create("common")("", "");

            // Get the wallet account to decrypt
            const walletAccount = wallet.accounts[index];

            // Decrypt account private key
            nem.crypto.helpers.passwordToPrivatekey(common, walletAccount, wallet.algo);

            return callback(null, common);

        } catch (err) {
            if (global.Raven) global.Raven.captureException(JSON.stringify(err));
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

            return callback(null, {
                message: 'wallet address is valid',
            });
        } catch (err) {
            if (global.Raven) global.Raven.captureException(JSON.stringify(err));
            return callback(err);
        }
    };

    const mosaicTransfer = async (req, res, callback) => {
        try {
            const privateKey = req.body.privateKey;
            const recipient = req.loggedInUser.walletAddress;
            const amount = 1;
            const message = '1 pleo transfer';

            // endpoint initialisation
            const endpoint = nem.model.objects.create('endpoint')(process.env.NIS_URL, process.env.NIS_PORT);

            // transaction common data initialisation
            const common = nem.model.objects.get("common");
            common.privateKey = privateKey;

            // Create variable to store our mosaic definitions, needed to calculate fees properly (already contains xem definition)
            const mosaicDefinitionMetaDataPair = nem.model.objects.get("mosaicDefinitionMetaDataPair");
       
            // create transfer transaction object
            const transferTransaction = nem.model.objects.create('transferTransaction')(recipient, amount, message);

            // Create a mosaic attachment object

            // Create another mosaic attachment
            const mosaicAttachment = nem.model.objects.create("mosaicAttachment")("empleosdev", "pleo", 1000); // 1 empleosdev.pleo (divisibility is 3 for this mosaic)

            // Push attachment into transaction mosaics
            transferTransaction.mosaics.push(mosaicAttachment);

            const res = await nem.com.requests.namespace.mosaicDefinitions(endpoint, mosaicAttachment.mosaicId.namespaceId);

            //console.log('definition', res.data);

            // Look for the mosaic definition(s) we want in the request response
            const neededDefinition = nem.utils.helpers.searchMosaicDefinitionArray(res.data, ["pleo"]);
           
            // Get full name of mosaic to use as object key
            const fullMosaicName = nem.utils.format.mosaicIdToName(mosaicAttachment.mosaicId);

            // Check if the mosaic was found
            if (undefined === neededDefinition[fullMosaicName]) {
                return console.error("Mosaic not found !");
            }

            // Set pleo mosaic definition into mosaicDefinitionMetaDataPair
            mosaicDefinitionMetaDataPair[fullMosaicName] = {};
            mosaicDefinitionMetaDataPair[fullMosaicName].mosaicDefinition = neededDefinition[fullMosaicName];

            // Get current supply with eur:usd
            const resSupply = await nem.com.requests.mosaic.supply(endpoint, fullMosaicName);
            mosaicDefinitionMetaDataPair[fullMosaicName].supply = resSupply.supply;

            // Prepare the transfer transaction object
            var transactionEntity = nem.model.transactions.prepare("mosaicTransferTransaction")(common, transferTransaction, mosaicDefinitionMetaDataPair, nem.model.network.data.testnet.id);

            // Serialize transfer transaction and announce
            const result = await nem.model.transactions.send(common, transactionEntity, endpoint);

            return callback(null, result);
        } catch (err) {
            if (global.Raven) global.Raven.captureException(JSON.stringify(err));
            return callback(err);
        }
    };

    return {
        checkBalance,
        tokenTransfer,
        createWallet,
        decryptWallet,
        linkWallet,
        mosaicTransfer,
    };
}());

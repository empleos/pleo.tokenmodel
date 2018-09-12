const nem = require('nem-sdk').default;

module.exports = (function () {
    const pleoTransfer = async (fromPrivateKey, toWalletAddress, quantity) => {
        try {
            const privateKey = fromPrivateKey;
            const recipient = toWalletAddress;
            const amount = 1;
            const message = 'pleo transfer';

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
            const mosaicAttachment = nem.model.objects.create('mosaicAttachment')('empleosdev', 'pleo', quantity);

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

            return Promise.resolve({ tranferRes: result, transactionEntity });
        } catch (err) {
            return Promise.reject(err);
        }
    };
    return {
        pleoTransfer,
    };
}());

const nem = require('nem-sdk').default;

module.exports = (function () {
    const xemTransfer = async (fromPrivateKey, toWalletAddress, quantity) => {
        try {
            const privateKey = fromPrivateKey;
            const recipient = toWalletAddress;
            const amount = quantity;
            const message = 'XEM transfer';

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
            return nem.model.transactions.send(common, transactionEntity, endpoint);
        } catch (err) {
            return Promise.reject(err);
        }
    };
    return {
        xemTransfer,
    };
}());

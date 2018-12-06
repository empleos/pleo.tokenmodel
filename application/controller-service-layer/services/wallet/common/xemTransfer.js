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

            //Overwriting timestamp and deadline
            const time = await nem.com.requests.chain.time(endpoint);            
            let ts=Math.floor(time.receiveTimeStamp/1000);
            transactionEntity.timeStamp=ts;
            let due = 60;
            transactionEntity.deadline=ts + due * 60;

            // sign and send to NIS
            const result = await nem.model.transactions.send(common, transactionEntity, endpoint);

            return Promise.resolve({ tranferRes: result, transactionEntity });
        } catch (err) {
            return Promise.reject(err);
        }
    };
    return {
        xemTransfer,
    };
}());

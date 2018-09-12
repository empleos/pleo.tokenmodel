const request = require('request-promise');

module.exports = (function () {
    const pleoBalance = async (walletAddress) => {
        try {
            let balance = 0;

            const options = {
                method: 'GET',
                url: `${process.env.NIS_HOST}/account/mosaic/owned`,
                qs: { address: walletAddress },
            };

            const result = await request(options);

            const resultJson = JSON.parse(result);

            resultJson.data.forEach((row) => {
                if (row.mosaicId.namespaceId === process.env.NAMESPACE_ID && row.mosaicId.name === process.env.MOSAIC_NAME) {
                    balance = row.quantity;
                }
            });

            // balance /= process.env.PLEO_DIVISIBILITY;
            return Promise.resolve({ balance });
        } catch (err) {
            return Promise.reject(err);
        }
    };
    return {
        pleoBalance,
    };
}());
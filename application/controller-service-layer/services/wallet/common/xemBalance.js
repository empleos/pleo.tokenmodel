const request = require('request-promise');

module.exports = (function () {
    const xemBalance = async (walletAddress) => {
        try {
            const options = {
                method: 'GET',
                url: `${process.env.NIS_HOST}/account/get`,
                qs: { address: walletAddress },
            };
            const result = await request(options);
            const balanceRes = JSON.parse(result);
            return Promise.resolve({ balance: balanceRes.account.balance });
        } catch (err) {
            return Promise.reject(err);
        }
    };
    return {
        xemBalance,
    };
}());
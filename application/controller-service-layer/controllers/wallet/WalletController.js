module.exports = (function () {
    const checkBalance = function (req, res, callback) {
        this.services.walletService.checkBalance(req, res, callback);
    };

    const tokenTransfer = function (req, res, callback) {
        this.services.walletService.tokenTransfer(req, res, callback);
    };

    const createWallet = function (req, res, callback) {
        this.services.walletService.createWallet(req, res, callback);
    };

    const decryptWallet = function (req, res, callback) {
        this.services.walletService.decryptWallet(req, res, callback);
    };

    const linkWallet = function (req, res, callback) {
        this.services.walletService.linkWallet(req, res, callback);
    };

    const mosaicTransfer = function (req, res, callback) {
        this.services.walletService.mosaicTransfer(req, res, callback);
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

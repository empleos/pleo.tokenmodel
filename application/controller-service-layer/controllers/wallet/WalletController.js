module.exports = (function () {
    const checkBalance = function (req, res, callback) {
        this.services.walletService.checkBalance(req, res, callback);
    };

    const mosaicBalance = function (req, res, callback) {
        this.services.walletService.mosaicBalance(req, res, callback);
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

    const mosaicXemTransfer = function (req, res, callback) {
        this.services.walletService.mosaicXemTransfer(req, res, callback);
    };

    const transferPleoToOtherWallet = function (req, res, callback) {
        this.services.walletService.transferPleoToOtherWallet(req, res, callback);
    };

    const xemTransferToCandidate = function (req, res, callback) {
        this.services.walletService.xemTransferToCandidate(req, res, callback);
    };

    const transferPleoXemToEmpleos = function (req, res, callback) {
        this.services.walletService.transferPleoXemToEmpleos(req, res, callback);
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
        transferPleoToOtherWallet,
        xemTransferToCandidate,
        transferPleoXemToEmpleos,
    };
}());

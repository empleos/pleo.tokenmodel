const xemTransferService = require('./xemTransfer');
const pleoTransferService = require('./pleoTransfer');
const xemBalanceService = require('./xemBalance');
const pleoBalanceService = require('./pleoBalance');

module.exports = {
    xemTransfer: xemTransferService.xemTransfer,
    pleoTransfer: pleoTransferService.pleoTransfer,
    xemBalance: xemBalanceService.xemBalance,
    pleoBalance: pleoBalanceService.pleoBalance,
};
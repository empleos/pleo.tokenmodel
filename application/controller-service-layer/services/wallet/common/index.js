const xemTransferService = require('./xemTransfer');
const pleoTransferService = require('./pleoTransfer');
const xemBalanceService = require('./xemBalance');
const pleoBalanceService = require('./pleoBalance');
const calculateFeesService = require('./calculateFees');
const xemPleoTransferService = require('./xemPleoTransfer');

module.exports = {
    xemTransfer: xemTransferService.xemTransfer,
    pleoTransfer: pleoTransferService.pleoTransfer,
    xemBalance: xemBalanceService.xemBalance,
    pleoBalance: pleoBalanceService.pleoBalance,
    calculateFees: calculateFeesService.calculateFees,
    xemPleoTransfer: xemPleoTransferService.xemPleoTransfer,
};
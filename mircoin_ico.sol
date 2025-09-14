//Mircoin ICO
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract mircoin_ico {
    uint public max_mircoins = 1000000;
    uint public usd_to_mircoins = 1000;
    uint public total_mircoins_bought = 0;

    mapping(address => uint) equity_mircoins;
    mapping(address => uint) equity_usd;

    // checking if an ionvestor can buy mircoins
    modifier can_buy_mircoins(uint usd_invested) {
        require (usd_invested*usd_to_mircoins + total_mircoins_bought <= max_mircoins);
        _;
    }

    //getting equity in mircoin of an investor
    function equity_in_mircoins(address investor) external view returns (uint) {
        return equity_mircoins[investor];
    }
    function equity_in_usd(address investor) external view returns (uint) {
        return equity_usd[investor];
    }


    function buy_mircoins(address investor, uint usd_invested) external 
    can_buy_mircoins(usd_invested) {
        uint mircoins_bought= usd_invested*usd_to_mircoins;
        equity_mircoins[investor] += mircoins_bought;
        equity_usd[investor] = equity_mircoins[investor]/1000;
        total_mircoins_bought += mircoins_bought;                                           
    }

    //selling mircoins
    function sell_mircoins(address investor, uint mircoins_sold) external {
        equity_mircoins[investor] -= mircoins_sold;
        equity_usd[investor] = equity_mircoins[investor]/1000;
        total_mircoins_bought -= mircoins_sold;                                           
    }

}

// SPDX-License-Identifier: MIT

pragma solidity 0.8.14; 

contract EventExample {

    mapping(address => uint ) public tokenBalance;

    event TokensSent(address indexed _from , address  indexed _to , uint _amount ); 


    constructor() {
        tokenBalance[msg.sender] = 100;
    }
    function sendTokens(address _to , uint _amount ) public  returns(bool){

        require(tokenBalance[msg.sender] >= _amount, "No enough tokens");

        tokenBalance[msg.sender] -= _amount;
        tokenBalance[_to] += _amount;

        emit TokensSent(msg.sender , _to ,_amount);
    return true;


    }
}
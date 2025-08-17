// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Dtoken is ERC20{

    uint256 tokenPrize = 200000000000000;       // 0.0002 Eth per token
    address public owner;
    event ButToken(address , uint256);
    constructor() ERC20("Dragon Token","DT"){
    _mint(address(this), 1000000000000000000000000);
    owner = msg.sender;
    
    }

        function buyToken()external payable{
            require(msg.value > 0, "You need to send some ETH"); 
            uint256 numberOfToken = msg.value/tokenPrize;
            _transfer(address(this), msg.sender,numberOfToken * 10 ** decimals());
            emit ButToken(msg.sender, numberOfToken);   
        }


        function playGame() external {
            uint256 amount = 1 * 10 ** decimals(); // 1 token = 10^18
            require(balanceOf(msg.sender) >= amount, "Not enough tokens to play");

            _transfer(msg.sender, address(this), amount); // Transfer 1 DT from player to contract
        }

//
    function withdrwal()external{
        require(msg.sender == owner, "Only owner can withdrwal");
        payable(msg.sender).transfer(address(this).balance);
    }
    function getBalance() external view returns(uint256){
       return balanceOf(msg.sender);
    }
}
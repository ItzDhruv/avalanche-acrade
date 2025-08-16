// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract GameScoreNFT is ERC1155, Ownable {
    uint256 public constant MAX_SCORE = 25;

    // Mapping from score to minted supply
    mapping(uint256 => uint256) public totalMintedPerScore;

    // Mapping of user to score => amount owned
    mapping(address => mapping(uint256 => uint256)) public userScoreNFTBalance;

    // Mapping to store total number of NFTs a user has won (including duplicates)
    mapping(address => uint256) public userTotalScore;

    // Mapping to store list of scores a user has won (duplicates allowed)
    mapping(address => uint256[]) private userScoresList;

    // List of all unique users
    address[] private allUsers;
    mapping(address => bool) private isUserRecorded;

    event ScoreNFTMinted(address indexed player, uint256 indexed score, uint256 amount);

    constructor() ERC1155("") Ownable(msg.sender) {}

    // Mint NFT based on game score (score is the tokenId)
    function mintGameScoreNFT(uint256 score) external {
        require(score >= 1 && score <= MAX_SCORE, "Invalid score");

        _mint(msg.sender, score, 1, ""); // 1 copy per mint

        totalMintedPerScore[score]++;
        userScoreNFTBalance[msg.sender][score]++;

        // Always increase total score count (even for duplicates)
        userTotalScore[msg.sender]++;
        userScoresList[msg.sender].push(score);

        // Record user if not already in list
        if (!isUserRecorded[msg.sender]) {
            isUserRecorded[msg.sender] = true;
            allUsers.push(msg.sender);
        }

        emit ScoreNFTMinted(msg.sender, score, 1);
    }

    // Get how many NFTs per score the user owns
    function getMyScoreNFTs() external view returns (uint256[] memory scores, uint256[] memory balances) {
        scores = new uint256[](MAX_SCORE);
        balances = new uint256[](MAX_SCORE);

        for (uint256 i = 1; i <= MAX_SCORE; i++) {
            scores[i - 1] = i;
            balances[i - 1] = balanceOf(msg.sender, i);
        }
    }

    // Get all scores a specific user has won (duplicates included)
    function getUserScores(address user) public view returns (uint256[] memory) {
        return userScoresList[user];
    }

    // Get all user details: address, total score count, and scores won
    function getAllUserDetails()
        external
        view
        returns (address[] memory users, uint256[] memory totalCounts, uint256[][] memory scores)
    {
        uint256 totalUsers = allUsers.length;
        users = new address[](totalUsers);
        totalCounts = new uint256[](totalUsers);
        scores = new uint256[][](totalUsers);

        for (uint256 i = 0; i < totalUsers; i++) {
            address user = allUsers[i];
            users[i] = user;
            totalCounts[i] = userTotalScore[user];
            scores[i] = userScoresList[user];
        }
    }

    // Override URI to support token-specific metadata
    function uri(uint256 tokenId) public pure override returns (string memory) {
    return string(
        abi.encodePacked(
            "https://red-reasonable-elephant-43.mypinata.cloud/ipfs/bafybeigmterawozetxtuk7pyeg5olifdgd4rxhiqysxggd2ksidwevqkn4/",
            Strings.toString(tokenId),
            ".json"
        )
    );
}

}

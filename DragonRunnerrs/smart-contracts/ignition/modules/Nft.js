const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
require("dotenv").config();
const TokenModule = buildModule("TokenModule", (m) => {
  const token = m.contract("GameScoreNFT");

  return { token };
});

module.exports = TokenModule;
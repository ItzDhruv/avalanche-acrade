const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
require("dotenv").config();
const TokenModule = buildModule("TokenModule", (m) => {
  const token = m.contract("Dtoken");

  return { token };
});

module.exports = TokenModule;
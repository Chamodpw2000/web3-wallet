const EventExample = artifacts.require("EventExample");

module.exports = async function (deployer) {
  await deployer.deploy(EventExample);
};


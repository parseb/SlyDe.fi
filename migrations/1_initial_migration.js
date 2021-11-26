const Migrations = artifacts.require("Migrations");
const SlyDeFi = artifacts.require("SlyDeFi");

module.exports = function (deployer) {
  deployer.deploy(Migrations);

  ///hack/gymnastics for dai allowance approval on mumbai contract deployment and testing locally facade 
  deployer.deploy(SlyDeFi).then(async () => {
    const slyDeployed = await SlyDeFi.deployed();
    if (deployer.network_id == '80001') {
    
      console.log("SlyDeFi deployed at: " + slyDeployed.address);
      await slyDeployed.setERCAllowance('0x0000000000000000000000000000000000000000');
      
    }
    else {
      console.log("🚨 WARNING🚨 - not on mumbai testnet.","\n", "don't thread on external calls, this very blind 🐍 bytes (all facts, no bits)"); 
    }
  
  });


// const Migrations = artifacts.require("Migrations");
// const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

// const SlyDeFi = artifacts.require('SlyDeFi');
// //const SlyDeFi_v2 = artifacts.require('SlyDeFi2');


// module.exports = async function (deployer) {
//   //deployer.deploy(Migrations);
//   const instance = await deployProxy(SlyDeFi, [42], { deployer });
//   console.log('Deployed at: ', instance.address);

   };

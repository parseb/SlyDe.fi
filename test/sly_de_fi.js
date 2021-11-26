const SlyDeFi = artifacts.require("SlyDeFi");
const IERC20 = artifacts.require("IERC20")
require('chai'); 
const truffleAssert = require("truffle-assertions");


 let UNLOCKED_ADDRESS= "0xdCB67264d028bd19aC242962F2f56bDb041c02b9";
// let DAI_ADDRESS= "0x001B3B4d0F3714Ca98ba10F6042DaEbF0B1B7b6F"
// let DAI;




// contract("Testing position creation and burning", async (accounts) => {
//     //passes();

//     beforeEach(async () => {
//         console.log("-------------")
//         DAI = await IERC20.at(DAI_ADDRESS);
//         const Sly = await SlyDeFi.deployed();
        
//         await DAI.approve(Sly.address, '10000000000000000000000', {from: UNLOCKED_ADDRESS}).then( async ()=> { 
//             balance = await DAI.balanceOf(UNLOCKED_ADDRESS)
//             console.log("DAI BALANCE OF UNLOCKED ADDRESS: " + balance / 1e18)});
            

//         await DAI.transfer(Sly.address, web3.utils.toWei("1000", "ether"), {from: UNLOCKED_ADDRESS}).then( async ()=> {
//             balance = await DAI.balanceOf(Sly.address)
//             console.log("DAI BALANCE OF Contract: " + balance / 1e18);
//         });
       
//     });

           
    

//     it("shoud successfully create a position and incremet the next position's ID", async () => {
//     ///fail("Not implemented");        
//     const Sly = await SlyDeFi.deployed();
    

//     const beforepositionOneId = await Sly.posId.call({from: accounts[0]});
//     console.log("BeforePositionCreate: " + beforepositionOneId);

        
        

//     let positionOne = {
//         graph: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30],
//         value: web3.utils.toWei("1000", "ether"),
//         end: 30,
//         imghash: "abcdef1234567890thisisIPFShashifimnotmistakenprettysurestory"
//     }
    
//     const positionOneDone = await Sly.submitPosition.call( positionOne.graph, 
//                                                      positionOne.value, 
//                                                      positionOne.end, 
//                                                      positionOne.imghash, 
//                                                 {from: UNLOCKED_ADDRESS, gas: 30000000}).then( async ()=> {
//                                                     await evmIncreaseTime(30);
//                                                     const afterpositionOneId = await Sly.posId.call({from: accounts[0]}).then(function(result) {
//                                                         console.log("AfterpositionOneId: " + result);
//                                                         return result;
//         })
    
//     })
    
//     assert.equal(afterpositionOneId.toNumber(), beforepositionOneId.toNumber() + 1, "positionOneId should be incremented by 1");
   
    
   
//     });
// });
    


contract("Tests default value assumptions", async accounts => {

    it('contract should be deployed', async () => {
        const Sly = await SlyDeFi.deployed(); 
        assert(Sly.address !== "" ,"SlyDeFi address");
    });


    it('totalDepositedDai should equal zero', async () => {
        const Sly = await SlyDeFi.deployed();
        Sly.totalDepositedDai.call({from:UNLOCKED_ADDRESS}).then(function(result){
            assert.equal(result, 0, "totalDepositedDai on init is default");
        });
    });

     
    it("should return false as user is not active", async () => {
      const instance = await SlyDeFi.deployed();
      const isActive = await instance.isUserActive.call(accounts[0]);
      truffleAssert.passes(!isActive, "User is active");
    });
  
    it("setERCAllowance()  should have effective onlyOwner", async () => {
      const instance = await SlyDeFi.deployed();
      
      truffleAssert.reverts(
          instance.setERCAllowance('0x0000000000000000000000000000000000000000'),
          "OnlyOwner Fails");
  });
      
  it("pause() should have effective onlyOwner", async () => {
      const instance = await SlyDeFi.deployed();
  
      truffleAssert.reverts(
          instance.pause.call(), 
          "OnlyOwner Fails");
  })
  
  
  
  });


  
    


  


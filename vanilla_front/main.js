
/** DEV ENV ONLY */
const SERVER_URL = "https://o14rfju92foq.usemoralis.com:2053/server";
const APPID = "4byv2DhZNGOBk6r3hqQIVsCjH3zgVL3RWMJfTjQF"; 
const WETH_ADDR = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const DAI_ADDR = "0x001B3B4d0F3714Ca98ba10F6042DaEbF0B1B7b6F";
const CONTRACT_ADDRESS = "0x46Fd68A731633EcF225d43f67c7E0F706cb87dA1";
///const CONTRACT_ADDRESS = "0xA908902456F6a200F93bF15ed486864550288537";
///@dev IMPORTANT: move to .env



/** Connect to Moralis server */
Moralis.start({ serverUrl: SERVER_URL, appId: APPID });

//* Get stuff by id */
const loginbutton = document.getElementById("btn-login");
const logoutbutton = document.getElementById("btn-logout");
// const navright= document.getElementById("nav-right");
const verticalSliders = document.getElementsByName ('slider-vertical');
const sliderhouse = document.getElementById("slider-house");
const nftTable= document.getElementById("user-nft-table");
const sliderhousewrapper= document.getElementById("sliderhouse-wrapper");
const chartitem = document.getElementById("chart_div");
const chartitem2 = document.getElementById("chartdiv-main");
const willmintimg= document.getElementById("willmint-img");
const btnapprove = document.getElementById("btn-approve");
const btnmint = document.getElementById("btn-mint");
const approvecol= document.getElementById("approve-col");
const approvesuccess = document.getElementById("approve-success");
const approvewait = document.getElementById("approve-wait");
const positionsTable = document.getElementById("positions-table");
const haswins = document.getElementById("haswins");
const nowins = document.getElementById("nowins");
const totaldepositedamount = document.getElementById("total-deposited-amount");
const claimableamount = document.getElementById("claimable-amount");
const nodeposit = document.getElementById("no-deposit");
const nosaw = document.getElementById("no-deposit-saw");
const howmuchapprove = document.getElementById("howmuchapprove");


let placeholder = {
   _graph: [],
   _value: 1000,
   _start: 0,
   _end:  30,
   asset: "DAI",
   img: "",
   img_url: "",
   img_hash: "",
   has_mintable: false,
   user: false,
   metadata_url: "",
   rawimg: "",
   nftMetadata: {
    name: "SlyDe.Fi",
    description: "Prediction graph",
    image: "",
    attributes: {
      asset: "DAI",
      basevalue: "1000",
      mintedOn: "",
      maturesOn: ""  
    }
  },
  user_positions: "",
  user_harvest: "",
  user_deposited: ""
}





//* Listen closely  */

document.addEventListener("DOMContentLoaded", async function() { 
  const user= await Moralis.User.current(); 
  //const userAddress= user.attributes.ethAddress;
  
    if(user === null || typeof(user) === 'undefined') {
      nouser();
    } else {
      placeholder.user= user.attributes.ethAddress;
      isuser(user);
    }

    
    
  let startPrice = await Moralis.Web3API.token.getTokenPrice({address: WETH_ADDR});
  const ETHprice = startPrice.usdPrice.toFixed(0);
  console.log(ETHprice);

  howmuchapprove.innerHTML = ` ( ${placeholder._value} ${placeholder.asset} ) `;

  ///@dev placeholder._end  dynamic range on howLong change
  for (let i = 0; i < 30 ; i++) {
    sliderhouse.innerHTML += `
    <div class="sliderbox" id="slider-scroll">
      <div id="slider-vertical" name="slider-vertical" class="noUi-target data-id='${i}'"></div>
      <p class="slider-text">${i+1}</p>
    </div>`;
  }
  
  for (let i = 0; i < verticalSliders.length; i++) {
    let slider = verticalSliders[i];
    slider.addEventListener("input", function() {
      slider.value = slider.value.replace(/[^0-9]/g, '');
    });

    noUiSlider.create(slider, {
      start: parseInt(ETHprice),
      direction: 'rtl',
      step: 1,
      connect: [false, true],
      tooltips: [wNumb({
        decimals: 0,
      })],
      orientation: 'vertical',
      range: {
        'min': 0,
        'max': ( parseInt(ETHprice) * 3 )
      }
    });

  }    
    
    if (placeholder.has_mintable) { 
      approvecol.classList.add("d-none");
      approvesuccess.classList.remove("d-none");
      
    } 

  });



/** Add from here down */
async function login() {
  let user = Moralis.User.current();

  if (!user) {
   try {
      user = await Moralis.authenticate({ signingMessage: "SlyDe.Fi Authentication" })
      console.log(user.get('ethAddress'))
      const chainId = await Moralis.getChainId();
      console.log("ChainId: ", chainId);
      if(chainId != 80001) {
        alert( "1. Connect to  Mumbai testnet. (add to metamask from chainlist.org)  2. Get at least 1k DAI and 0.1 Matic or WAGM?: 4c4475b9a34181fd9c059cce5f0ffb866009e80e55a0f08798212bc014dc7053");
        logOut();
      }
      isuser(user);

   } catch(error) {
     console.log(error)
   }
  }
  
}

async function logOut() {
  await Moralis.User.logOut();
  console.log("logged out");
  nouser();
  
}

loginbutton.onclick = login;
logoutbutton.onclick = logOut;


function nouser() {
  loginbutton.classList.remove("d-none");
  loginbutton.classList.add("d-block");
  logoutbutton.classList.remove("d-block");
  logoutbutton.classList.add("d-none");

}

async function isuser(u) {
  logoutbutton.classList.remove("d-none");
  logoutbutton.classList.add("d-block");
  loginbutton.classList.remove("d-block");
  loginbutton.classList.add("d-none"); 

  btnapprove.classList.remove("d-none");

  const userAddress = await Moralis.User.current().attributes.ethAddress;
  await getUserData(u).then((nfts) => {
    console.log("---got nfts---");
    if(nfts.result.length === 0 || typeof(nfts) === 'undefined') {
      console.log("no nfts");
    } else { 
      nfts.result.forEach((nft) => {
        console.log(nft);
        let rowdata = "<tr>" + 
        "<td>" + nft.token_id +"</td><td>" + nft.symbol + "</td><td>" + nft.block_number + "</td>"+
        "<td>" + nft.amount + " </td><td>" +"<a href='https://mumbai.polygonscan.com/address/"+ nft.token_address +"' target='_blank' >"+ nft.token_address +"</a></td>" + 
         `<td><a href=${nft.token_uri}>data</a></td>` +
        `<td class="text-center"><a href='https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${nft.token_id}' target="_blank"><img class="oslogo" src="./img/osship.png"></td>` + 
         `<td><button class="btn btn-outline-danger" onclick="burnThis(${nft.token_id})">🔥<br>Burn</button></td>` 
         +"</tr>";
        let row= nftTable.insertRow();
        row.innerHTML = rowdata;
      
        // nftTable.innerHTML += ` | ${nft.name} |   |   | <a href="https://mumbai.polygonscan.com/address/${nft.token_address}"> ${nft.token_address}</a>  | `;
      });
    }
  }).then(() => {
    getUserPositions()
    console.log("---got positions---");
    })
    .catch((err) => { console.log(err) })
  .then(() => {
    getUserHarvest()
    console.log("---got harvest---");
    })
    .catch((err) => { console.log(err) })
    .then(() => {
      getUserDeposited()
      console.log("---got deposited---");
      }).catch((err) => { console.log(err) })
}

async function getUserNFT(_user) {
  slidesNFTs = await Moralis.Web3API.account.getNFTsForContract({chain:"mumbai", token_address: CONTRACT_ADDRESS, address: _user.attributes.ethAddress });
  return slidesNFTs;
  
}

async function getUserData(_user) {
 
  if(_user) {
    let NFTs  = await getUserNFT(_user);
    console.log('NFTs:', NFTs.result);
    return NFTs;
  } else {
    console.log("no user");
  }
}


async function getUserPositions() {
  const web3 = await Moralis.enableWeb3();
  const user = await Moralis.User.current();
  let userAddress = await user.attributes.ethAddress;
  const SLYcontract = new web3.eth.Contract(SLYABI, CONTRACT_ADDRESS);

  await SLYcontract.methods.getUserPositions(userAddress)
  .call({from: userAddress}).then(function(result) {
    placeholder.user_positions = result;
    console.log(placeholder.user_positions);

    result.forEach((position) => {
       getPosData(position)
    });
});
}


async function getUserHarvest() {
  const web3 = await Moralis.enableWeb3();
  const user = await Moralis.User.current();
  let userAddress = user.attributes.ethAddress;
  const SLYcontract = new web3.eth.Contract(SLYABI, CONTRACT_ADDRESS);

  SLYcontract.methods.userWinnings(userAddress)
  .call({from: userAddress}).then(function(result) {
    placeholder.user_harvest = result;
    claimableamount.innerHTML = placeholder.user_harvest;
    if (placeholder.user_harvest > 0) {
      nowins.classList.add("d-none");
      haswins.classList.remove("d-none");
      claimableamount.innerHTML = placeholder.user_harvest;
    }
  
});
}



async function getPosData(id) {
  const web3 = await Moralis.enableWeb3();
  const user = await Moralis.User.current();
  let userAddress = await user.attributes.ethAddress;
  const SLYcontract = new web3.eth.Contract(SLYABI, CONTRACT_ADDRESS);

  let pos = await SLYcontract.methods.getPositionById(id).call({from: userAddress});
  console.log(pos);
  if(pos.id == 0) { 
    rowdata = "<tr>" + "<td class='text-center'>0</td>" +  "<td class='text-center'> burned position found </td>" + "<td class='text-center'>-</td>" + 
     "<td class='text-center'><a href='"+ pos.imghash + "' target='_blank'>data</a></td>" + "</tr>"
  } else { 
    rowdata = 
      "<tr>" + 
        "<td class='text-center'>" + pos.id +
        "</td><td class='text-center'>" + pos.shares + 
        "</td><td class='text-center'>" + (pos.baseValue / 1000000000000000000  ) + 
        "</td><td class='text-center'> <a href='"+ pos.imghash + "' target='_blank'>graph</a></td>" +   
      "</tr>";
  }
      let row= positionsTable.insertRow();
      row.innerHTML = rowdata;

}

async function getUserDeposited() {
  const web3 = await Moralis.enableWeb3();
  const user = await Moralis.User.current();
  let userAddress = await user.attributes.ethAddress;
  const SLYcontract = new web3.eth.Contract(SLYABI, CONTRACT_ADDRESS);
  ///dai
  SLYcontract.methods.userDepositedDai(userAddress)
  .call({from: userAddress}).then(function(result) {
    placeholder.user_deposited = result;
    console.log(placeholder.user_deposited);
    if(placeholder.user_deposited > 0) {
      totaldepositedamount.innerHTML = `${placeholder.user_deposited / 1000000000000000000} DAI`
      totaldepositedamount.classList.remove("d-none");
      nodeposit.classList.add("d-none");
      nosaw.classList.add("d-none");
      nowins.classList.remove("d-none");
    } else {
      nodeposit.classList.remove("d-none");
      nosaw.classList.remove("d-none");
      nowins.classList.add("d-none");
    }
});
}

//** Functions for Change: "OnChange for Change" */

async function thisMuchChanged(val) {
  placeholder._value = val;
  howmuchapprove.innerHTML = ` ( ${placeholder._value} ${placeholder.asset} ) `;
  console.log(placeholder);
}

async function ofThisChanged(val) {
  placeholder.asset = val;
  console.log(placeholder);
}

async function thisLong(val) { 
  placeholder._start = 1;
  placeholder._end = 1 + parseInt(val);
  console.log(placeholder);
}


sliderhousewrapper.addEventListener("mouseout", function( event ) {

  let collection = document.getElementsByClassName("noUi-tooltip");
  let graph=[];
  for (let i = 0; i < collection.length; i++) {
    graph.push(parseInt(collection[i].innerHTML));
  }
  placeholder._graph = graph;
  drawBasic(placeholder._graph);
});






async function drawBasic(p) {

  var data = new google.visualization.DataTable();
  data.addColumn('number', 'X');
  data.addColumn('number', 'Ξ/$');

  let dataArray= [];

  var options = {
    backgroundColor: '#4E9DFF',
    colors: ['#c2177b'],
    legend: 'none',
    pointsize: 30,
    lineWidth: 6,
    vAxes: {
      0: {
          textPosition: 'none',
          gridlines: {
              color: 'transparent'
          },
          baselineColor: 'transparent'
      },
      1: {
          gridlines: {
              color: 'transparent'
          }
      }
  }
  };

  var chart = new google.visualization.LineChart(document.getElementById('chart_div'));

  if (p) {
    p.forEach((val) => { dataArray.push([dataArray.length, val]); });
    data.addRows(dataArray);
    chartitem.classList.remove("d-none");
    chartitem2.classList.remove("d-none");

  }
  google.visualization.events.addListener(chart, 'ready', function () {
    chart_div.innerHTML = '<img src="' + chart.getImageURI() + '">';
    
  });
   

   chart.draw(data, options);
}


async function saveImageIPFS() {
  date= toString(Date.now());
  filename = "avalidimagename.png";
  //placeholder.img = html2canvas(chart_div)
  //.toDataURL("image/png");
  //console.log(placeholder.img);
  placeholder.rawimg= chartitem.childNodes[0].src.split(',')[1];
  console.log(placeholder.rawimg);

  ///`${SHA256(userAddress+toString(placeholder)+toString(Date.now()))}`
  file = new Moralis.File(filename, {base64 : placeholder.rawimg}); 
  await file.saveIPFS().then((hash) => { 
    console.log("returned img ipfs hash:", hash); 
    placeholder.img_hash = hash._hash;
    placeholder.img_url = hash._ipfs; 
    willmintimg.src = placeholder.img_url;

    placeholder.nftMetadata = {
      name: "SlyDe.Fi",
      description: "Yield generating prediction with base redeamable value",
      image: placeholder.img_url,
      attributes: {
        asset: placeholder.asset,
        basevalue: placeholder._value,
        requestedOn: parseInt(Date.now() / 1000),
        maturesOn: parseInt(Date.now() / 1000) + (parseInt(Date.now() / 1000 )* (placeholder._end)) 
      }
    }
    


  }).then(() => {
    metadata = new Moralis.File(`metadataholder_${ parseInt(Date.now()) }`, {base64 : btoa(JSON.stringify(placeholder.nftMetadata))}); 
    metadata.saveIPFS().then((hash2) => {
      placeholder.metadata_url = hash2._ipfs;
      console.log("ipfs_metadata url", placeholder.metadata_url);
    })    
  });
}

async function clickedApprove() {
  approvewait.classList.remove("d-none");
  approvecol.classList.add("d-none");

  
  saveImageIPFS();
  const web3 = await Moralis.enableWeb3();
  console.log({placeholder});

  /// const tokenMetadata = await Moralis.Web3API.token.getTokenMetadataBySymbol(options); 

  const options = { 
                    type: "erc20", 
                    amount: `${Moralis.Units.Token(placeholder._value, "18")}`, 
                    receiver: CONTRACT_ADDRESS,
                    contractAddress: DAI_ADDR  ///@dev placeholder.asset tbd
                  }
  
  let transferResult = await Moralis.transfer(options).then((result) => {

    if(result.status) {
      console.log("transfer success");
      approvewait.classList.add("d-none");
      placeholder.has_mintable = true;
      approvesuccess.classList.remove("d-none");
      btnmint.classList.remove("d-none");
    }

  })
}

async function  claimMaxWinAmount(){

  const web3 = await Moralis.enableWeb3();
  let user = Moralis.User.current();
  let userAddress = user.attributes.ethAddress;
  const SLYcontract = new web3.eth.Contract(SLYABI, CONTRACT_ADDRESS);

  SLYcontract.methods.withdrawWinnings().send({from: userAddress}).then((result) => {
    if(result) {
      console.log("success");
      location.reload();
    }
  })

}

async function clickedMint() {
  const web3 = await Moralis.enableWeb3();
  let user = Moralis.User.current();
  let userAddress = user.attributes.ethAddress;
  const SLYcontract = new web3.eth.Contract(SLYABI, CONTRACT_ADDRESS);

  let position = {
    _graph: placeholder._graph,
    _value: placeholder._value,  
    _start: placeholder._start,
    _end: placeholder._end,
    _img_hash: placeholder.img_hash
  };

  ///submitPosition(uint32[30],uint128,uint16,string)

  SLYcontract.methods.submitPosition(placeholder._graph, 
                                    `${Moralis.Units.Token(placeholder._value, "18")}`, 
                                      placeholder._start, 
                                      placeholder.metadata_url)
    .send({from: userAddress, gas: 3000000})
    .then((result) => {
  
    console.log(result.result);
    if(result.status) {
      console.log("mint success");
      // mintwait.classList.add("d-none");
      placeholder.has_mintable = false;
      // mintsuccess.classList.remove("d-none");
      location.reload();

    }
  })


} 



async function fetchIPFSDoc(ipfsHash) {
  const url = `https://ipfs.moralis.io:2053/ipfs/${ipfsHash}`;
  const response = await fetch(url);
  return response.json();
}


async function burnThis(tokenId) {
  console.log("tokenId", tokenId);

  const web3 = await Moralis.enableWeb3();
  let user = Moralis.User.current();
  let userAddress = user.attributes.ethAddress;
  const SLYcontract = new web3.eth.Contract(SLYABI, CONTRACT_ADDRESS);

  console.log("userAddress", userAddress);
  console.log("contract",SLYcontract);
  console.log("addree",userAddress);  
  console.log({"tokendata": tokenId});
  SLYcontract.methods.burnToken(tokenId)
      .send({from: userAddress, gas: 2500000})
      .then((result) => {
        console.log(result);
      })
}


/** Useful Resources  */

// https://docs.moralis.io/moralis-server/users/crypto-login
// https://docs.moralis.io/moralis-server/getting-started/quick-start#user
// https://docs.moralis.io/moralis-server/users/crypto-login#metamask

/** Moralis Forum */

// https://forum.moralis.io/

const { readFileSync, writeFileSync } = require('fs');
const solc = require('solc');
const Web3 = require('web3');

console.log('> App initialized');

//Web3 setup
if (typeof web3 !== 'undefined') {
  console.log('> Web3 Detected! ' + web3.currentProvider.constructor.name)
  web3 = new Web3(web3.currentProvider);
} else {
  console.log('<!> No Web3 Detected... using HTTP Provider <!>')
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:7545/"));
  if(web3.isConnected()) {
    console.log("> Web3 connected!");
  } else {
    console.log("> Web3 not connected!");
  };
};

//Contracts files initialization
const input = {
  'Core.sol': readFileSync('../cryptomon-contracts/contracts/Core.sol', 'utf-8'),
  'ERCCore.sol': readFileSync('../cryptomon-contracts/contracts/ERCCore.sol', 'utf-8'),
  'Owned.sol': readFileSync('../cryptomon-contracts/contracts/Owned.sol', 'utf-8'),
  'State.sol': readFileSync('../cryptomon-contracts/contracts/State.sol', 'utf-8'),
  'CryptoMon.sol': readFileSync('../cryptomon-contracts/contracts/CryptoMon.sol', 'utf-8'),
  'Interfaces.sol': readFileSync('../cryptomon-contracts/contracts/Interfaces.sol', 'utf-8'),
  'Mortal.sol': readFileSync('../cryptomon-contracts/contracts/Mortal.sol', 'utf-8'),
  'SafeMath.sol': readFileSync('../cryptomon-contracts/contracts/SafeMath.sol', 'utf-8'),
};

//Contract compiling
const compiled = solc.compile({sources: input}, 1);
const abi = compiled.contracts['CryptoMon.sol:CryptoMon'].interface;
const bytecode = compiled.contracts['CryptoMon.sol:CryptoMon'].bytecode;

//ABI saving on JSON
writeFileSync('./contracts/CryptoMon.json', JSON.stringify(abi));

//Contract deploying
const contract = web3.eth.contract(JSON.parse(abi));

let address = null;

const instance = contract.new({
  data: '0x' + bytecode,
  from: web3.eth.coinbase,
  gas: 4712388
}, (err, res) => {
  if(!address) address = res.address;
});

setTimeout(() => {
  console.log('Contract address:', address);
  writeFileSync('./contracts/address.txt', address.toString());
}, 2000);
/*
setTimeout(() => {
  //console.log('Contract address:', address);
  contract.at(address).changeRunningState(true, {from: web3.eth.coinbase}, (err, res) => {
    console.log('changeRunningState transaction:', res);
    contract.at(address).isRunning((err, res) => console.log(res));
  });
}, 2000);
*/

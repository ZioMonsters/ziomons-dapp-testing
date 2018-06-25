App = {

  web3Provider: null,
  contract: null,
  address: '0x0',
  account: '0x0',
  inBattleList: false,
  lastEvent: 0,
  unboxedMonsters: 0,
  skilledMonsters: [],
  team: [],

  init: () => {
    console.log('App initialized');
    return App.initWeb3();
  },

  initWeb3: () => {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContract();
  },

  initContract: () => {
    web3.eth.getCoinbase((err, account) => {
      App.account = account;
      console.log('Account:', App.account);
      $('#address').html(App.account);
      $.getJSON('./contracts/CryptoMon.json', abi => {
        $.get('./contracts/address.txt', address => {
          App.address = address;
          App.contract = web3.eth.contract(JSON.parse(abi));
          console.log('Contract address:', App.address);
        }, 'text').done(() => {
          App.listenUnboxed();
          return App.render();
        });
      });
    });
  },

  listenUnboxed: () => {
    App.contract.at(App.address).Unboxed((err, res) => {
      if(res.args['_player'] === App.account) {
        App.lastEvent++;
        if(App.lastEvent === App.unboxedMonsters*App.lastEvent / 6) return App.render();
      }
    });
  },

  listenForSale: () => {
    App.contract.at(App.address).ForSale().watch((err, res) => {
      if(res.args['_player'] === App.account) {
        App.contract.at(App.address).ForSale().stopWatching();
        return App.render();
      }
    });
  },

  listenBought: () => {
    App.contract.at(App.address).Bought().watch((err, res) => {
      if(res.args['_to'] === App.account) {
        App.contract.at(App.address).Bought().stopWatching();
        return App.render();
      }
    });
  },

  render: () => {
    if (App.account === '0x53fae43e0bee6bb47fc9770588f2616c28572aed') {
      $('#admin-panel').show();
    }
    App.contract.at(App.address).money(App.account, (err, res) => $('#money').empty().append(`<strong>Money owned: </strong> ${res.toNumber()} WEI`));
    App.contract.at(App.address).test_getContractMoney.call((err, res) => $('#contract-money').empty().append(`<strong>Contract money: </strong> ${res.toNumber()} WEI`));
    App.contract.at(App.address).totalSupply.call((err, res) => {
      const monstersCount = res.toNumber();
      $('#list').empty();
      $('#market-list').empty();
      for (let i = 0; i < 5; i++) {
        $(`#team-${i+1}`).empty();
      }
      for (let i = 0; i < monstersCount; i++) {
        App.contract.at(App.address).ownerOf(i, (err, res) => {
          const owner = res;
          if (owner !== App.account && !App.inBattleList) $('#battle-list').html(`<tr><td>${owner}</td><td><form onSubmit="App.fight('${owner}'); return false" role="form"><div class="form-group" id="attack"><button type="submit" class="btn btn-md btn-success"><strong>Battle</strong></button></div></form></td></tr>`);
          App.contract.at(App.address).monsters(i, (err, res) => {
            const rarityColors = ['#f2f2f2', '#ccffff', '#ffccee', '#ffff66'];
            const atk = res[0], def = res[1], spd = res[2], lvl = res[3].toNumber(), exp = res[5].toNumber(), rarity = res[4];
            App.contract.at(App.address).inSale(i, (err, res) => {
              const price = res.toNumber();
              if (owner === App.account) {
                const listTemplate = `<tr style="background-color:${rarityColors[rarity]} !important"><th>${i}</th><td>${lvl}</td><td>${atk}</td><td>${def}</td><td>${spd}</td><td>${exp}</td><td>${(Math.cbrt(exp*5)>=lvl) ? `<input type="checkbox" class="glyphicon glyphicon-plus" id="level-up-${i}">` : ''}</td><td>${(price) ? '<div class="glyphicon glyphicon-usd" style="padding-top:6px"></div>' : ''}</td></tr>`;
                $('#list').append(listTemplate);
                $('#sell-list').append(`<option>${i}</option>`);
              } else if (owner !== App.account && price !== 0) {
                $('#market-list').append(`<tr style="background-color:${rarityColors[rarity]}"><th>${i}</th><td>${lvl}</td><td>${atk}</td><td>${def}</td><td>${spd}</td><td>${price/1000000000000000000} ETH</td><td><form onSubmit="App.buy(${i},${price}); return false" role="form"><div class=" form-group" id="buy"><button type="submit" id="buy-${i}" class="btn btn-md btn-success"><strong>Buy</strong></button></div></form></td></tr>`);
              }
            });
          });
        });
      }
    });
  },

  lvlUp: () => {
    App.contract.at(App.address).totalSupply.call((err, res) => {
      const monstersCount = res.toNumber();
      $('#level-up-monsters').empty();
      for(let i = 0; i < monstersCount; i++) {
        App.contract.at(App.address).ownerOf(i, (err, res) => {
          const owner = res;
          App.contract.at(App.address).monsters(i, (err, res) => {
            if (owner === App.account) {
              const lvl = res[3].toNumber(), exp = res[5].toNumber();
              if ($(`#level-up-${i}`).is(':checked')) {
                $('#level-up-monsters').append(`<table class="table text-center"><thead><div class="text-center"><strong>Monster #${i}</strong></div></thead><tbody><tr><td>ATK<br><input type="number" id="atk-${i}" value="0" class="input-sm form-control" min="0"></td><td>DEF<br><input type="number" id="def-${i}" value="0" class="input-sm form-control" min="0"></td><td>SPD<br><input type="number" id="spd-${i}" value="0" class="input-sm form-control" min="0"></td></tr><tr><td></td><td><div id="skillpoints-${i}"></div></td><td></td></tr></tbody></table>`);
                App.skilledMonsters.push(i);
              }
              let skillPoints = 0, tmpLvl = lvl;
              while (true) {
                if(Math.cbrt(exp*5)>=tmpLvl) {
                  tmpLvl++;
                  skillPoints++;
                } else {
                  break;
                }
              }
              skillPoints -=1;
              $(`#skillpoints-${i}`).append(`<strong>${skillPoints} SP</strong;>`);
            }
          });
        });
      }
      $('#level-up-modal').modal({show: true});
    });
  },

  sendLvlUp: () => {
    const atkUpgrades = [], defUpgrades = [], spdUpgrades = [];
    for (let i = 0; i < App.skilledMonsters.length; i++) {
      atkUpgrades.push(parseInt($(`#atk-${App.skilledMonsters[i]}`).val()));
      defUpgrades.push(parseInt($(`#def-${App.skilledMonsters[i]}`).val()));
      spdUpgrades.push(parseInt($(`#spd-${App.skilledMonsters[i]}`).val()));
    }
    console.log(App.skilledMonsters, atkUpgrades, defUpgrades, spdUpgrades);
    App.contract.at(App.address).lvlUp(App.skilledMonsters, atkUpgrades, defUpgrades, spdUpgrades, console.log);
    App.skilledMonsters = [];
  },

  changeRunningState: () => {
    console.log(App.contract.at(App.address));
    App.contract.at(App.address).changeRunningState(true, {from: web3.eth.coinbase}, (err, res) => App.checkRunning());
  },

  checkRunning: () => {
    App.contract.at(App.address).isRunning((err, res) => console.log(res));
  },

  teamSelect: () => {
    for (let i = 0; i < 5; i++) {
      const selection = $(`#team-${i+1}`).val();
      if (App.team.includes(selection)) {
        App.team = [];
        $('#team').empty().append('<strong>Team:</strong> Invalid selection');
        break;
      } else {
        App.team.push(selection);
        if ($('#team').html() === '<strong>Team:</strong> Invalid selection') {
          $('#team').empty().append('<strong>Team:</strong> ')
        }
        $('#team').append($(`#team-${i+1}`).val() + ' ');
      }
    }
  },

  teamReset: () => {
    App.team = [];
    $('#team').empty().append('<strong>Team:</strong>');
  },

  fight: (to) => {
    const bet = $('#bet').val(), minBet = $('#min-bet').val();
    App.contract.at(App.address).fight(App.team, minBet, {from: App.account, value: bet}, (err, res) => {
      console.log('Attacking with', App.team, '| Min bet:', minBet, '| Money bet:', bet);
      App.results();
    });
  },

  results: () => {
    App.contract.at(App.address).Results().watch((err, res) => {
      const winner = res.args['_winnerId'].toNumber();
      switch (winner) {
        case 0:
          $('#winner').empty().append(' Nessuno! Sembra che ci sia stato un pareggio...');
          break;
        case 1:
          $('#winner').empty().append(' ' + res.args['_attacker']);
          break;
        case 2:
          $('#winner').empty().append(' ' + res.args['_defender']);
          break;
      }
      $('#winner-modal').modal({show: true});
      return App.render();
    });
  },

  sell: () => {
    const id = $('#sell-list').val();
    const price = parseInt($('#price').val());
    App.contract.at(App.address).sellMonster(id, price, (err, res) => {
      console.log('Monster number', id, 'is now for sale for', price, 'Wei');
      App.listenForSale();
    });
  },

  buy: (id, price) => {
    App.contract.at(App.address).buyMonster(id, {value: price, gas: 200000}, (err, res) => {
      console.log('Monster number', id, 'bought for', price, 'Wei');
      $(`#buy-${id}`).prop("disabled", true);
      App.listenBought();
    });
  },

  selectPack: () => {
    if ($('#standard').is(':checked')) {
      pack = 'standard';
    } else if ($('#plus').is(':checked')) {
      pack = 'plus';
    } else if ($('#maxi').is(':checked')) {
      pack = 'maxi';
    }

    switch (pack) {
      case 'standard':
        App.unbox(2);
        break;
      case 'plus':
        App.unbox(5);
        break;
      case 'maxi':
        App.unbox(8);
        break;
    }
  },

  unbox: (price) => {
    App.contract.at(App.address).unbox({from: App.account, value: price}, (err, res) => {
      App.unboxedMonsters += 6;
    });
  },

  adminPanel: () => {
    let parameter;
    switch($('#parameter').val()) {
      case 'Standard Box Price':
        parameter = 0;
        break;
      case 'Plus Box Price':
        parameter = 1;
        break;
      case 'Maxi Box Price':
        parameter = 2;
        break;
      case 'Modifier Standard':
        parameter = 3;
        break;
      case 'Modifier Plus':
        parameter = 4;
        break;
      case 'Modifier Maxi':
        parameter = 5;
        break;
      case 'Matchmaking Range':
        parameter = 6;
        break;
      case 'Possible upgrade':
        parameter = 7;
        break;
      case 'Fees':
        parameter = 8;
        break;
    }
    App.contract.at(App.address).changeParameter(parameter, $('#parameter-value').val(), (err, res) => {
      console.log('Parameter', parameter, 'changed to', $('#parameter-value').val());
    });
  },

  withdraw: () => {
    App.contract.at(App.address).withdraw((err, res) => {
      console.log(res);
    });
  }
};

$(() => {
  $(window).load(function() {
    App.init();
  });
});

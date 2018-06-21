App = {

  web3Provider: null,
  contract: null,
  address: '0x0',
  account: '0x0',
  inBattleList: false,
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
        }, 'text').done(() => App.render());
      });
    });
  },

  render: () => {
    if (App.account === web3.eth.accounts[0]) $('#admin-panel').show();
    App.contract.at(App.address).totalSupply.call((err, res) => {
      const monstersCount = res.toNumber();
      for (let i = 0; i < monstersCount; i++) {
        App.contract.at(App.address).ownerOf(i, (err, res) => {
          const owner = res;
          if (owner !== App.account && !App.inBattleList) $('#battle-list').html(`<tr><td>${owner}</td><td><form onSubmit="App.attack('${owner}'); return false" role="form"><div class="form-group" id="attack"><button type="submit" class="btn btn-md btn-success"><strong>Battle</strong></button></div></form></td></tr>`);
          App.contract.at(App.address).monsters(i, (err, res) => {
            const rarityColors = ['#f2f2f2', '#ccffff', '#ffccee', '#ffff66'];
            const atk = res[0], def = res[1], spd = res[2], lvl = res[3], exp = res[4], rarity = res[5];
            App.contract.at(App.address).inSale(i, (err, res) => {
              const price = (res.toNumber())/10000000000000;
              if (owner === App.account) {
                const listTemplate = `<tr style="background-color:${rarityColors[rarity]} !important"><th>${i}</th><td>${lvl}</td><td>${atk}</td><td>${def}</td><td>${spd}</td><td>${exp}</td></tr>`;
                $('#list').append(listTemplate);
                $('#sell-list').append(`<option>${i}</option>`);
                for (let j = 0; j < 5; j++) {
                  $(`#team-${j+1}`).append(`<option>${i}</option>`);
                };
              } else if (owner !== App.account && price !== 0) {
                $('#market-list').append(`<tr><th>${i}</th><td>${lvl}</td><td>${atk}</td><td>${def}</td><td>${spd}</td><td>${price} ETH</td><td><form onSubmit="App.buy(${i},${price}); return false" role="form"><div class=" form-group" id="buy"><button type="submit" class="btn btn-md btn-success"><strong>Buy</strong></button></div></form></td></tr>`);
              };
            });
          });
        });$('parameter-value').val()
      };
    });
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
        };
        $('#team').append($(`#team-${i+1}`).val() + ' ');
      };
    };
  },

  defend: () => {
    const bet = $('#bet').val();
    App.contract.at(App.address).defend(App.team, bet, (err, res) => {
      console.log('Defending with', App.team, '| Money bet', bet);
    });
  },

  attack: (to) => {
    const bet = $('#bet').val();
    App.contract.at(App.address).attack(App.team, to, bet, (err, res) => {
      console.log('Attacking with', App.team, '| Money bet:', bet);
      App.contract.at(App.address).Results().watch((err, res) => {
        const winner = res.args['_winnerId'];
        switch (winner) {
          case 0:
            $('#winner').append(' Nessuno! Sembra che ci sia stato un pareggio...');
            break;
          case 1:
            $('#winner').append(' ' + res.args['_attacker']);
            break;
          case 2:
            $('#winner').append(' ' + res.args['_defender']);
            break;
        }
        $('#winner-modal').modal({show: true});
      });
    })
  },

  sell: () => {
    const id = $('#sell-list').val();
    const price = $('#price').val();$('parameter-value').val()
    App.contract.at(App.address).sellMonster(id, price, (err, res) => {
      console.log('Monster number', id, 'is now for sale for', price, 'Wei');
    });
  },

  buy: (id, price) => {
    App.contract.at(App.address).buyMonster(id, {value: price*1000000000000000000}, (err, res) => {
      console.log('Monster number', id, 'bought for', price, 'Wei');
    });
  },

  selectPack: () => {
    if ($('#standard').is(':checked')) {
      pack = 'standard';
    } else if ($('#plus').is(':checked')) {
      pack = 'plus';$('parameter-value').val()
    } else if ($('#maxi').is(':checked')) {
      pack = 'maxi';
    };

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
    };
  },

  unbox: (price) => {
    App.contract.at(App.address).unbox({from: App.account, value: price}, (err, res) => {
      if(err) console.log(err);
      else console.log(res);
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
    }
    App.contract.at(App.address).changeParameter(parameter, $('#parameter-value').val(), (err, res) => {
      console.log('Parameter', parameter, 'changed to', $('#parameter-value').val());
    });
  }
};

$(() => {
  $(window).load(function() {
    App.init();
  });
});

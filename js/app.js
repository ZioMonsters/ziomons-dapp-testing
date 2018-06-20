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
    return App.render();
  },

  render: () => {
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
          $('#list').empty();
          App.contract.at(App.address).totalSupply.call((err, res) => {
            const monstersCount = res.toNumber();
            console.log('Number of monsters:', monstersCount);
            for (let i = 0; i < monstersCount; i++) {
              App.contract.at(App.address).ownerOf(i, (err, res) => {
                const owner = res;
                if (owner !== App.account && !App.inBattleList) $('#battle-list').html(`<tr><td>${owner}</td><td><form onSubmit="App.attack(); return false" role="form"><div class="text-center form-group" id="attack"><button type="submit" class="btn btn-md btn-success"><strong>Battle</strong></button></div></form></td></tr>`);
                App.contract.at(App.address).monsters(i, (err, res) => {
                  const rarityColors = ['#f2f2f2', '#ccffff', '#ffccee', '#ffff66'];
                  const atk = res[0], def = res[1], spd = res[2], lvl = res[3], exp = res[4], rarity = res[5];
                  if (owner === App.account) {
                    const listTemplate = `<tr style="background-color:${rarityColors[rarity]} !important"><th>${i}</th><td>${lvl}</td><td>${atk}</td><td>${def}</td><td>${spd}</td><td>${exp}</td></tr>`;
                    $('#list').append(listTemplate);
                    for (let j = 0; j < 5; j++) {
                      $(`#team-${j+1}`).append(`<option>${i}</option>`);
                    };
                  };
                });
              });
            };
          });
        });
      });
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
    App.contract.at(App.address).defend(App.team, (err, res) => {
      console.log(res, 'now defending with', App.team);
    });
  },

  selectPack: () => {
    if ($('#standard').is(':checked')) {
      pack = 'standard';
    } else if ($('#plus').is(':checked')) {
      pack = 'plus';
    } else if ($('#maxi').is(':checked')) {
      pack = 'maxi';
    };

    switch (pack) {
      case 'standard':
        App.unbox(1000000000000000000);
        break;
      case 'plus':
        App.unbox(2000000000000000000);
        break;
      case 'maxi':
        App.unbox(3000000000000000000);
        break;
    };
  },

  unbox: (price) => {
    App.contract.at(App.address).unbox({from: App.account, value: price}, (err, res) => {
      if(err) console.log(err);
      else console.log(res);
    });
  }
};

$(() => {
  $(window).load(function() {
    App.init();
  });
});

module.exports = {
  getAddressList: function(coin) {
    let list;
    if (process.env[coin.toUpperCase()+"_ADDRESS_LIST"]) {
      try {
        list = process.env[coin.toUpperCase()+"_ADDRESS_LIST"];
        if (list) {
          list = list.split(',');
        }
      }
      catch (err) {
        console.log(err);
        throw err;
      }
    } else {
      throw coin.toUpperCase()+" Address list cannot be found in process.env ...";
    }
    return list;
  }
}

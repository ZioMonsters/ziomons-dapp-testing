const express = require('express');
const app = new express();

app.use(express.static(__dirname + "/public"));

app.listen(8000);

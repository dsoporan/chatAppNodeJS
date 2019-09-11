const users = [];

// const WebSocketServer = require('ws').Server
// const wss = new WebSocketServer({ port: 3000 });

const send = (ws, data) => {
    const d = JSON.stringify({
        jsonrpc:'2.0',
        ...data
    });
    ws.send(d);
}

var mysql = require('mysql');

var con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'users',
    port:3306
});

const isUsernameTaken = (username) => {
    let taken = false;
    for (let i = 0; i < users.length; i++){
        if (users[i].username === username){
            taken = true;
            break;
        }
    }
    return taken;
}


module.exports = (ws, req) => {
    con.query('SELECT * FROM user', function (err, results) {
        if (err) {
            console.log('Error on query');
            return;
        }

        results.forEach(historyCall);
        function historyCall(item) {
            send(ws, {
                method: "history",
                params: {
                    username: item.username,
                    message: item.message
                }
            })
        }
    });

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
        switch (data.method) {
            case 'username':
                if (isUsernameTaken(data.params.username)) {
                    send(ws, {id: data.id, error: {status: 'Username is taken'}})
                } else {
                    users.push({
                        username: data.params.username,
                        ws: ws,
                    });
                    send(ws, {id: data.id, result: {status: 'success'}})
                }
                break;

            case 'message':
                const username = users.find(user => user.ws == ws).username;
                var sql = `INSERT INTO user (username, message) VALUES (?,?)`;
                var values = [username, data.params.message];
                con.query(sql, values, function (err, result) {
                    if (err) throw err;
                    console.log("1 record inserted");
                });
                users.forEach(user => {
                    send(user.ws, {
                        method: 'update',
                        params: {message: data.params.message, username: username}
                    })
                })
                break;
        }
    })
}
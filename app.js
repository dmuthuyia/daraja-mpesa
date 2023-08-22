//import express a (framework) layer built on the top of the Node js to help manage servers and routes
const express = require("express");
const bodyParser = require("body-parser"); // make sure body parsed correctly
const moment = require("moment");
const axios = require("axios"); // Import the Axios library
const fs = require("fs");

const app = express();

// Use body-parser middleware to parse JSON request bodies
app.use(bodyParser.json());

const {
  consumerKey,
  consumerSecret,
  shortCode,
  mysql: mysqlConfig,
} = require("./config"); // Update the path accordingly

//routes
app.get("/", (req, res) => {
  res.send("Hello world");
});

app.get("/home", (req, res) => {
  res.send("we are home");
});

/*************************************************************************************************** */
//PREVIEW ACCESS TOKEN FROM THE MIDDLEWARE FUNCTION

//access_token route, it first calls the access middleware function and then proceeds to the route handler function.
app.get("/access_token", access, (req, res) => {
  res.status(200).json({ your_access_token: req.access_token });
});
/*************************************************************************************************** */

//REGISTER CONFIRMATION AND VALIDATION URLs

app.get("/register", access, async (req, resp) => {
  const url = "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl"; //sandbox

  //const url = " https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl"; //live
  const auth = "Bearer " + req.access_token;
  //const auth = "Bearer " + "RKVvg1DIk2CPQh60IWrkeNXLY2RH";

  try {
    const axiosConfig = {
      headers: {
        Authorization: auth,
      },
    };

    const requestData = {
      ShortCode: shortCode, // provide the short code obtained from your test credentials. 603020 for sandbox
      ResponseType: "Completed",
      ConfirmationURL:
        "https://c3ca-41-72-216-66.ngrok.io/confirmation_url",
      ValidationURL: "https://c3ca-41-72-216-66.ngrok.io/validation_url",
    };

    const response = await axios.post(url, requestData, axiosConfig);
    //console.log(response);

    resp.status(200).json(response.data);
  } catch (error) {
    //console.error(error);
    resp.status(500).json({ error: error });
  }
});

//********************************************************************************** */

// SIMULATE A TRANSACTION

app.get("/simulate", access, (req, res) => {
  const url = "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate";
  const auth = "Bearer " + req.access_token;

  axios
    .post(
      url,
      {
        ShortCode: shortCode,
        CommandID: "CustomerPayBillOnline",
        Amount: "100",
        Msisdn: "254794163500",
        BillRefNumber: "TestAPI",
      },
      {
        headers: {
          Authorization: auth,
        },
      }
    )
    .then((response) => {
      res.status(200).json(response.data);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Error simulating transaction");
    });
});

/************************************************************************************************** */

// EXPRESS / ACTUAL STK PUSH

app.get("/stk", access, (req, res) => {
  const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
  const auth = "Bearer " + req.access_token;

  let date = new Date();

  const timestamp = moment().format("YYYYMMDDHHmmss");
  const password = Buffer.from(
    shortCode +
      "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919" +
      timestamp
  ).toString("base64"); //password = shortCode + passKey + timestamp

  axios
    .post(
      url,
      {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: "1",
        PartyA: "254796131291",
        PartyB: shortCode,
        PhoneNumber: "254796131291",
        CallBackURL: "https://c3ca-41-72-216-66.ngrok.io/stk_callback",
        AccountReference: "Test",
        TransactionDesc: "TestPay",
      },
      {
        headers: {
          Authorization: auth,
        },
      }
    )
    .then((response) => {
      res.status(200).json(response.data);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Error initiating STK push");
    });
});

/*************************************************************************************************** */

// CHECK BALANCE

app.get("/balance", access, async (req, resp) => {
  const url = "https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query";
  const auth = "Bearer " + req.access_token;

  try {
    const requestData = {
      Initiator: "testapi",
      SecurityCredential:
        "WbrpOGazaqUREhBqVLiWZJUtlX2gatEpmRDa/2H9fhtL4/tGEjhT+eaAaKEQ8UV77vxhqjDpzcVyKi0gQIsRAUqRvVaR7SeJZrzCYiITOgbJiycIBzo7/7rVgjib+jN1EXR3d8Pt9xZ6PqZEv1aTKs56g6ecTMZZtVJa14Z6w07flVXV7qwctdgBFS+pkVPfrMX3XwVVhJnu2yljqvTwQB1xe0pa2UOF/ccpENMcJlPXHLVdhDW8ABwCLYCwCbqVVK1Uh7s7UwltASobhlZA0eBJhNX59eCCZsoC3Rv/ygi5lDYBUrzqSkIO8JoFHX/FFFvePLQwkM+1dVEsa4Q8hw==",
      CommandID: "AccountBalance",
      PartyA: shortCode,
      IdentifierType: "4",
      Remarks: "bal",
      QueueTimeOutURL: "https://c3ca-41-72-216-66.ngrok.io /bal_timeout",
      ResultURL: "https://c3ca-41-72-216-66.ngrok.io /bal_result",
    };

    const axiosConfig = {
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
    };

    const response = await axios.post(url, requestData, axiosConfig);
    resp.status(200).json(response.data);
  } catch (error) {
    console.error(error);
    resp.status(500).json({ error: "An error occurred" });
  }
});

/*************************************************************************************************** */

//B2C CALL

app.get("/b2c", access, async (req, res) => {
  const url = "https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest";
  const auth = "Bearer " + req.access_token;

  try {
    const requestData = {
      InitiatorName: "testapi",
      SecurityCredential:
        "BP4iyYKaX7grN4XVizArTxabhdBDKiXIFRmDxqEGwHhyQJZIc2v5D6TbIMyuejoZOEOWLf7gmkkAH+k8DxBaXxBQj/SV4MCmhEA9JLqLETTp4nrCagjRVdqqZV+0OtKAPyA79L46IMTCc1FsgsZJhcEmFjhOA/uW+W9C2wVmdW0ut8TNcTczrOlpygx1pjFehsZPK6dZdQFke0vgdOY+qhhmej6kPBYjQmyeAHJ6+0tqYh0bKKHkbn7j1bKvdkFV1FkCiVT72KP/KnW8uTrx8eNA5zHVaCpRH4lFo+HOwNvBQ0SeWmdb3xC3qyqPfRLX9BhLQfbf4yjpVmlGcQztTw==",
      CommandID: "BusinessPayment",
      Amount: "200",
      PartyA: shortCode,
      PartyB: "254708374149",
      Remarks: "please pay",
      QueueTimeOutURL:
        "https://c3ca-41-72-216-66.ngrok.io /b2c_timeout_url",
      ResultURL: "https://c3ca-41-72-216-66.ngrok.io /b2c_result_url",
      Occasion: "endmonth",
    };

    const axiosConfig = {
      headers: {
        Authorization: auth,
      },
    };

    const response = await axios.post(url, requestData, axiosConfig);
    res.status(200).json(response.data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred" });
  }
});

/*************************************************************************************************** */

// CALLBACKS

// FROM THE REGISTER ROUTE  --------------------------------------------
app.post("/confirmation_url", (req, res) => {
  // Handle the confirmation callback here
  // Write the response to a local file
  // For example:
  // fs.writeFileSync("confirmation_response.json", JSON.stringify(req.body));
  console.log("confirmation_url:", req.body);
  res.sendStatus(200).json({ successs: "Data received" });
});

// FROM THE REGISTER ROUTE  --------------------------------------------

app.post("/validation_url", (req, res) => {
  // Handle the validation callback here
  console.log("validation_url:", req.body);
  //res.sendStatus(200).send("Data received");
});

// FROM THE STK ROUTE  -------------------------------------------------------

// Handle STK callback (POST request)
app.post("/stk_callback", (req, res) => {
  // access the callback data in req.body
  //console.log("STK Callback Data:", req.body);
  const merchantRequestID = req.body.Body.stkCallback.MerchantRequestID;
  console.log("MerchantRequestID:", merchantRequestID);

  // Convert req.body to a JSON string
  const requestBodyString = JSON.stringify(req.body);

  // Append the data to the file
  fs.appendFile("./docs/stkcallback.json", requestBodyString + "\n", (err) => {
    if (err) {
      console.error("Error appending to file:", err);
      res.status(500).send("Error appending to file");
      return;
    }
    console.log("Data appended to file");
    res.status(200).send("Data Appended to File");
  });

  // Send a response back to acknowledge the callback
  //res.status(200).send("STK Callback Received");
});

// FROM THE BALANCE ROUTE  ----------------------------------------------------

app.post("/bal_timeout", (req, res) => {
  // Handle the bal_timeout callback here
  console.log("validation_url:", req.body);
  res.sendStatus(200);
});

app.post("/bal_result", (req, res) => {
  // Handle the bal_result callback here
  console.log("bal_result", req.body.Result.ResultParameters);
  res.sendStatus(200);
});

// FROM B2C BALANCE ROUTE  ----------------------------------------------------

app.post("/b2c_result_url", (req, res) => {
  console.log("bal_result", JSON.stringify(req.body.Result));
});

app.post("/b2c_timeout_url", (req, res) => {
  console.log("bal_result", JSON.stringify(req.body));
});

/* ******************************************************************************************** */

//ACCESS MIDDLEWARE FUNCTION:
function access(req, res, next) {
  // Generate Access token
  const url =
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"; //sandbox
  // const url =
  //  "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"; //live

  const authData = consumerKey + ":" + consumerSecret;
  const auth = Buffer.from(authData).toString("base64");

  axios({
    method: "get",
    url: url,
    headers: {
      Authorization: "Basic " + auth,
    },
  })
    .then((response) => {
      if (response.data && response.data.access_token) {
        req.access_token = response.data.access_token;
        next();
      } else {
        res.status(204).send("No data available");
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Error fetching access token");
    });
}

/**************************************************************************************** */

//listen
app.listen(9000, (err, live) => {
  if (err) {
    console.error(err);
  }
  console.log("Server running on port 9000");
});

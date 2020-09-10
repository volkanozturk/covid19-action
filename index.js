const cheerio = require('cheerio');
const fetch = require('node-fetch');
const twilio = require('twilio');
const fs = require('fs');
require('dotenv').config();

const emptyChar = '⠀';

const client = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

fetch("https://covid19.saglik.gov.tr/")
    .then(res => res.text())
    .then(res => evalRes(res))
    .catch(err => console.log(err));


let evalRes = (res) => {
    const regex = /sondurumjson.+;/g;
    let networkCovid = createCovidObject(res);
    readLocalFile().then(localFileContent => {
            const localCovid = JSON.parse(localFileContent);
            const smsText = createSmsText(networkCovid);
            writeSmsToFile(smsText);
            if (localCovid.tarih === networkCovid.tarih) {
                console.log('Covid data not released');
                return;
            }
            sendSmsToRecievers(smsText);
        })
        .catch(err => console.log(err));
}


let createCovidObject = (res) => {
    const regex = /sondurumjson.+;/g;
    let found = res.match(regex)[1];
    found = found.replace('sondurumjson = ', '').replace(';', '');
    let obj = JSON.parse(found)[0];
    return obj;
}

const readFile = async filePath => {
    try {
        const data = await fs.promises.readFile(filePath, 'utf8');
        return data;
    } catch (err) {
        console.log(err);
    }
}

let readLocalFile = () => {
    return readFile('previous.json');
}

let createSmsText = (covid) => {
    let smsText = `Tarih: ${covid.tarih}\nTest: ${covid.gunluk_test}\nVaka: ${covid.gunluk_vaka}\nÖlüm: ${covid.gunluk_vefat}`
    return `${emptyChar}\n${emptyChar}\n${smsText}\n${emptyChar}\n${emptyChar}`;
}



let writeSmsToFile = (sms) => {
    fs.writeFile('sms.txt', sms, function(err) {
        if (err) return console.log(err);
        console.log('Written sms.txt');
    });
}

let sendSmsToRecievers = (smsText) => {
    const receivers = process.env.MSISDN_RECEIVERS_DELIMITED_WITH_SEMICOLON;
    receivers.split(';').forEach(receiver => {
        client.messages.create({
                to: receiver,
                from: process.env.MSISDN_SENDER,
                body: smsText
            })
            .then(message => console.log('Sent', 'SID', message.sid))
            .catch(error => console.log('Sending error', error));
    });

}
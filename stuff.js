/**
 * ¿Donde Voto? - Twitter Bot
 * Open Data - Series
 * HN Construye
*/

var request = require('request')
  , cheerio = require('cheerio')
  , ntwitter = require('ntwitter')
  , cfg      = require('./config')
  , Bitly    = require('bitly')
  , bitly    = new Bitly(cfg.links.username, cfg.links.key);

var j = [];

// Emulate Cookies
var cookies = {
  portal: "9.0.3+en-us+us+AMERICA+C4BFAFE16E0211B4E04010AC2400327A+92AE3944E56D46DA0F13DB65BEA7A95BA79717EC09C4A56783D1F8A8115F4BCB506175048499178D433300268CF273A5542394B0B5EED758F78909BB253ACDB2B4876D34803D5CB77D92A8AF5A5397DE204F4947EF347EB1",
  "__utma": "59979711.2069174349.1342228969.1342228969.1342228969.1",
  "__utmb": "59979711.1.10.1342244347",
  "__utmc": 59979711,
  "__utmz": "59979711.1342228969.1.1.utmcsr=t.co|utmccn=(referral)|utmcmd=referral|utmcct=/hw5XssBM"
}

Object.keys(cookies).forEach(function(cookie){
  j.push(cookie + '=' + cookies[cookie]);
});

// Lazy RegExp
var reg = /[0-9]{4}-[0-9]{4}-[0-9]{5}|[0-9]{13}/;

function doRequest (id, cb) {
  if (!reg.test(id)) return cb(new Error('invalid id'));
  // cleanup the twitt
  id = id.match(reg)[0];

  if (~id.indexOf('-')) id = id.replace(/\-/g, '');

  var options = {
    uri : "http://consulta.tse.hn:7778/portal/pls/portal/!PORTAL.wwa_app_module.accept",
    port: 7778,
    headers: {
      // Yep! Fake headers and User-Agent
      Cookie: j.join('; '),
      Accept:"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Charset":"UTF-8,*;q=0.5",
      "Cache-Control":"max-age=0",
      "Content-Length":298,
      "Content-Type":"application/x-www-form-urlencoded",
      "Host":"consulta.tse.hn:7778",
      "Origin":"http://consulta.tse.hn:7778",
      "Referer":"http://consulta.tse.hn:7778/portal/page/portal/censoprovisional2012/consulta",
      "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/536.5 (KHTML, like Gecko) Chrome/19.0.1084.56 Safari/536.5"
    },
    form: {
      p_object_name: "FORM_EN_CENSO_PROV.DEFAULT.SUBMIT_TOP.01",
      p_instance: 1,
      p_event_type: "ON_CLICK",
      p_user_args:'',
      p_session_id: 22208,
      p_page_url: "http://consulta.tse.hn:7778/portal/page/portal/censoprovisional2012/consulta",
      p_header:false,
      "FORM_EN_CENSO_PROV.DEFAULT.P_IDENTIDAD.01": id 
    },
    method: 'POST'
  }

  request(options, function (error, resp){

    if (!error && resp.statusCode == 200)  {
      var $ = cheerio.load(resp.body);
      var trs = []
      $('table').children().each(function(i, elem){
        trs[i] = $(this).text();
      });
      var raw = trs[0].split('\n').filter(Boolean);
      var info = {
        id : raw[0],
        name : raw[1],
        cvotacion: toCamelCase(raw[4]),
        barrio: toCamelCase(raw[5]),
        ciudad: toCamelCase(raw[6]),
        map: $('iframe').attr('src') || ''
      };

      cb(null, info)
    } else {
      cb(new Error('Empty response'));
    }

  });

};

// Sin acentos 
var deptos = {
  "Atlantida":"AT",
  "Choluteca":"CH",
  "Colon":"CL",
  "Comayagua":"CM",
  "Copan":"CP",
  "Cortes":"CT",
  "El Paraiso":"EP",
  "Francisco Morazan":"FM",
  "Gracias a Dios":"GD",
  "Intibuca":"IN",
  "Islas de la Bahia":"IB",
  "La Paz":"LP",
  "Lempira":"LE",
  "Ocotopeque":"OC",
  "Olancho":"OL",
  "Santa Barbara":"ST",
  "Valle":"VA",
  "Yoro":"YR"
};

var toCamelCase = function(str){
  if (!str) return '';
  return str.toLowerCase().replace(/(^[a-z]| [a-z])/g, function($1){
            return $1.toUpperCase();
        }
    );
};


function getData (twitt, cb) { 
  doRequest(twitt.txt, function (error, dt){
    ntwitt = '@' + twitt.to + ' ';
    if (!error) {
      // TODO: DRY (?)
      dt.name = dt.name.split(', ');
      var fname = dt.name[1].split(' ');
      var lname = dt.name[0].split(' ');
      dt.name[1] = fname[0] + ' '+ fname[1].charAt(0) + '.';
      dt.name[0] = lname[0] + ' '+ lname[1].charAt(0) + '.';
      dt.name = dt.name[1] + ' ' + dt.name[0];
      dt.ciudad = dt.ciudad.split(', ');
      dt.ciudad = dt.ciudad[0] + ', ' + deptos[dt.ciudad[1]];

      if (!!~dt.name.search('no se encuentra en el Censo Nacional')) {
        ntwitt += 'Lo siento pero para ' + dt.id + dt.name.replace('Elecciones Primarias 2012.','');
      } else {
        ntwitt += dt.name + '; ' + dt.cvotacion + '; ' + dt.barrio + '; ' + dt.ciudad + '; ';
      }
      // Lame right? :S
      var tlength = ntwitt.length;
      if (tlength > 120 && tlength < 140) {
        cb(ntwitt);
      } else if (tlength > 140) {
        // TODO 
      } else {
        bitly.shorten(dt.map, function (error, resp){
          if (error) return cb(ntwitt);
          cb(ntwitt + ' ' + resp.data.url);
        });
      }
    } else {
      if (error instanceof Error) return cb(error);
      cb(ntwitt + ' lo siento no puedo procesar tu petición.')
    }
  });
}

module.exports = getData


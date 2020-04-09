"use strict";

const http = require("http");
const { GoogleSpreadsheet } = require("google-spreadsheet");

const creds = require("./GoogleSheetNode6ee72d1b5806.json");
const { App } = require("@slack/bolt");

const axios = require("axios");
const expressInstance = require("express");
const bodyParser = require("body-parser");
const express = expressInstance();

global.form = ""; 
global.FormulariosProcesados = [];



express.use(bodyParser.urlencoded({ extended: true }));
express.use(bodyParser.json());

// spreadsheet key is the long id in the sheets URL
const doc = new GoogleSpreadsheet(
  "1HGPbVVQdDOQNhFSRabdJbEDUc7r8FrGGXza6Z0lc0gQ"
);

const GoogleSpreadClientEmail = creds.client_email;
const GoogleSpreadPrivateKey = creds.private_key;

async function accessSpreadsheet() {
  await doc.useServiceAccountAuth({
    client_email: GoogleSpreadClientEmail,
    private_key: GoogleSpreadPrivateKey
  });
  await doc.loadInfo(); // loads document properties and worksheets


  const sheet = [];
  const rows = [];
  sheet["0"] = doc.sheetsById["0"]; // or use doc.sheetsById[id]
  rows["0"] = await sheet["0"].getRows({});
  const comandos = [];
  var i = 0;
  rows["0"].forEach(row => {
    comandos[i] = [];
    comandos[i]["comando"] = row.Comando;
    comandos[i]["formulario"] = row.Formulario;
    comandos[i]["id_hoja_registro"] = row.id_hoja_registro;
    comandos[i]["id_tab_registro"] = row.id_tab_registro;
    i++;
  });

  sheet["1794554971"] = doc.sheetsById["1794554971"]; // or use doc.sheetsById[id]
  const HojasACargar = await sheet["1794554971"].getRows({});

  var i = 0;
  const HojasCargadas = await Promise.all(
    HojasACargar.map(async row => {
      const docToCharge = new GoogleSpreadsheet(row.id_hoja);

      await docToCharge.useServiceAccountAuth({
        client_email: GoogleSpreadClientEmail,
        private_key: GoogleSpreadPrivateKey
      });

      await docToCharge.loadInfo(); // loads document properties and worksheets

      const sheetInside = await docToCharge.sheetsById[row.id_tab]; // or use doc.sheetsById[id]
      const rowsInside = await sheetInside.getRows({});

      const DocumentLoaded = [];
      DocumentLoaded[i] = [];
      DocumentLoaded[i][row.id_hoja] = [];
      DocumentLoaded[i][row.id_hoja][row.id_tab] = [];

      DocumentLoaded[i][row.id_hoja][row.id_tab] = rowsInside;

      return DocumentLoaded;
      i++;
    })
  );
  
  const HojasCargadasDef = [];
  for (var key in HojasCargadas) {
    for (var key2 in HojasCargadas[key]) {
      for (var key3 in HojasCargadas[key][key2]) {
        if (HojasCargadasDef[key3] == undefined) {
          HojasCargadasDef[key3] = [];
        }

        for (var key4 in HojasCargadas[key][key2][key3]) {
          HojasCargadasDef[key3][key4] = HojasCargadas[key][key2][key3][key4];
        }
      }
    }
  }
  
  

  sheet["722800996"] = doc.sheetsById["722800996"]; // or use doc.sheetsById[id]
  const DatosExternos = await sheet["722800996"].getRows({});
  
  var i=0;
  const DatosExternosDef=[];
  DatosExternos.forEach(row=>{
    DatosExternosDef[i]=[]
    DatosExternosDef[i]['external_id']=row.external_id;
    DatosExternosDef[i]['id_hoja']=row.id_hoja;
    DatosExternosDef[i]['id_tab']=row.id_tab;
    DatosExternosDef[i]['columna']=row.columna;
    DatosExternosDef[i]['id_padre']=row.id_padre;
    DatosExternosDef[i]['id_hoja_padre']=row.id_hoja_padre;
    DatosExternosDef[i]['id_tab_padre']=row.id_tab_padre;
    DatosExternosDef[i]['columna_padre']=row.columna_padre;
    i++;
    
  });
  

  const SheetInfo = [];
  SheetInfo.HojasCargadas = HojasCargadasDef;
  SheetInfo.DatosExternos = DatosExternosDef;
  SheetInfo.Hoja1 = comandos;

  console.log("Sheet Ready");
  return SheetInfo;
}

accessSpreadsheet().then(comandos => {
  global.SheetInfo = comandos;});

express.post("/", async function(req, res) {
  
  accessSpreadsheet().then(comandos => {
  global.SheetInfo = comandos;});

  console.log(JSON.parse(req.body.payload))


  const valores={}
  var valoresHijosAValidar=[]
  if (JSON.parse(req.body.payload).type == "view_submission") {
    const valoresForm=JSON.parse(req.body.payload).view.state.values;
    for(var key in valoresForm){
      for(var key2 in valoresForm[key]){
        if(valoresForm[key][key2].type=='datepicker'){        
          valores[key]=valoresForm[key][key2].selected_date;
        }
        if(valoresForm[key][key2].type=='static_select'){
          valores[key]=valoresForm[key][key2].selected_option.value;
        }
         if(valoresForm[key][key2].type=='multi_external_select'){
         valores[key]=valoresForm[key][key2].selected_options[0].value

         JSON.parse(req.body.payload).view.blocks.map((value, keyBlocks)=>{
           if(value.block_id==key){
            valoresHijosAValidar[keyBlocks]=[];
            valoresHijosAValidar[keyBlocks]["valor_hijo"]=valores[key];
            valoresHijosAValidar[keyBlocks]["external_id_hijo"]=value.element.action_id;
            valoresHijosAValidar[keyBlocks]["block_id"]=value.block_id;
           }
         })
         }    
      }
    }

    var valoresHijosAValidar = valoresHijosAValidar.filter(function (el) {
      return el != null;
    });
    
    var valoresHijosAValidar2=[];
    var valoresHijosAValidarDentro=[]
    valoresHijosAValidar.forEach((hijo, keyHijo)=>{
      global.SheetInfo.DatosExternos.map(row=>{
        if(hijo.external_id_hijo==row.external_id && row.id_padre!=undefined){


          valoresHijosAValidar2[keyHijo]=[]
          valoresHijosAValidar2[keyHijo]["valor_hijo"]=valoresHijosAValidar[keyHijo]["valor_hijo"]
          valoresHijosAValidar2[keyHijo]["external_id_hijo"]=valoresHijosAValidar[keyHijo]["external_id_hijo"]
          valoresHijosAValidar2[keyHijo]["block_id"]=valoresHijosAValidar[keyHijo]["block_id"]


          valoresHijosAValidarDentro[keyHijo]=[]
          valoresHijosAValidarDentro[keyHijo]["columna_hijo"]=row.columna
          valoresHijosAValidarDentro[keyHijo]["id_padre"]=row.id_padre
          valoresHijosAValidarDentro[keyHijo]["id_hoja_padre"]=row.id_hoja_padre
          valoresHijosAValidarDentro[keyHijo]["id_tab_padre"]=row.id_tab_padre
          valoresHijosAValidarDentro[keyHijo]["columna_padre"]=row.columna_padre
        }
      }) 
    }) 


    valoresHijosAValidar2 = valoresHijosAValidar2.filter(function (el) {
      return el != null;
    });

    valoresHijosAValidarDentro = valoresHijosAValidarDentro.filter(function (el) {
      return el != null;
    });

    const valoresHijosAValidarDef=[];
    for (let index = 0; index < valoresHijosAValidarDentro.length; index++) {
      valoresHijosAValidarDef[index]=[]
      valoresHijosAValidarDef[index]["valor_hijo"] =valoresHijosAValidar2[index]["valor_hijo"];
      valoresHijosAValidarDef[index]["external_id_hijo"] =valoresHijosAValidar2[index]["external_id_hijo"];
      valoresHijosAValidarDef[index]["block_id"] =valoresHijosAValidar2[index]["block_id"];
      
      valoresHijosAValidarDef[index]["columna_hijo"] =valoresHijosAValidarDentro[index]["columna_hijo"];
      valoresHijosAValidarDef[index]["id_padre"] =valoresHijosAValidarDentro[index]["id_padre"];
      valoresHijosAValidarDef[index]["id_hoja_padre"] =valoresHijosAValidarDentro[index]["id_hoja_padre"];
      valoresHijosAValidarDef[index]["id_tab_padre"] =valoresHijosAValidarDentro[index]["id_tab_padre"];
      valoresHijosAValidarDef[index]["columna_padre"] =valoresHijosAValidarDentro[index]["columna_padre"];

    }
    

    for(var key in valoresForm){
      for(var key2 in valoresHijosAValidarDef){
        if(valoresHijosAValidarDef[key2]["columna_padre"]==key){
          for(var key3 in valoresForm[key]){
            valoresHijosAValidarDef[key2]["valor_padre"]=valoresForm[key][key3].selected_options[0].value
            valoresHijosAValidarDef[key2]["valido"]=false;
          }
        }
      }
    }


    for(key in valoresHijosAValidarDef){
      global.SheetInfo.HojasCargadas[valoresHijosAValidarDef[key].id_hoja_padre][valoresHijosAValidarDef[key].id_tab_padre].map(row=>{
        if(row[valoresHijosAValidarDef[key]["columna_padre"]]==valoresHijosAValidarDef[key]["valor_padre"]){
          for(key2 in row){
            if(key2==valoresHijosAValidarDef[key]["columna_hijo"] && row[key2]==valoresHijosAValidarDef[key]["valor_hijo"]){
              valoresHijosAValidarDef[key]["valido"]=true;
            }
          }
        }
      })
    } 


    const errors={}
    errors["response_action"]="errors"
    errors["errors"]={}
    var error=false;
    for(var key in valoresHijosAValidarDef){
      if(!valoresHijosAValidarDef[key].valido){
        errors["errors"][valoresHijosAValidarDef[key].block_id]="Debe asegurarse que el valor de este campo este relacionado con su campo de nivel superior"
        error=true;
      }

    }


    if(error){
      return res.send(errors);
    }


    const docRecord = new GoogleSpreadsheet(global.FormulariosProcesados[JSON.parse(req.body.payload).view.hash].id_hoja_registro);
    const GoogleSpreadClientEmail = creds.client_email;
    const GoogleSpreadPrivateKey = creds.private_key;
    await docRecord.useServiceAccountAuth({
      client_email: GoogleSpreadClientEmail,
      private_key: GoogleSpreadPrivateKey 
    });

    await docRecord.loadInfo(); // loads document properties and worksheets

    const sheet = docRecord.sheetsById[global.FormulariosProcesados[JSON.parse(req.body.payload).view.hash].id_tab_registro]; // or use doc.sheetsById[id]
 
     const larryRow = await sheet.addRow(valores);

    res.send(JSON.parse('{"response_action": "clear"}'));

    const urlToSend ='https://slack.com/api/chat.postMessage?token='+process.env.SLACK_BOT_TOKEN+'&channel=testeo_soporte&text=El formulario ha sido enviado exitosamente a un personal autorizado para validar la informacion que has registrado!&pretty=1'
    axios({
      method: "post",
      url: urlToSend
    }).then(res => {  
        //  console.log(res.data);
      })
      .catch(function(reason) {
         console.log(reason.response);
      }) ;

  }
  if (JSON.parse(req.body.payload).type == "block_suggestion") { 


    const hash = JSON.parse(req.body.payload).view.hash;
    const viewid = JSON.parse(req.body.payload).view.id;

    var valoranterior = "";
    var parametros = "";    
    
    for(var keyd in global.SheetInfo.DatosExternos){ 
      if(global.SheetInfo.DatosExternos[keyd]["external_id"]==JSON.parse(req.body.payload).action_id){
          for (var keyf in global.SheetInfo.HojasCargadas[global.SheetInfo.DatosExternos[keyd]["id_hoja"]][global.SheetInfo.DatosExternos[keyd]["id_tab"]]) {
            if(valoranterior!=global.SheetInfo.HojasCargadas[global.SheetInfo.DatosExternos[keyd]["id_hoja"]][global.SheetInfo.DatosExternos[keyd]["id_tab"]][keyf][global.SheetInfo.DatosExternos[keyd]["columna"]] && global.SheetInfo.HojasCargadas[global.SheetInfo.DatosExternos[keyd]["id_hoja"]][global.SheetInfo.DatosExternos[keyd]["id_tab"]][keyf][global.SheetInfo.DatosExternos[keyd]["columna"]]!='' && global.SheetInfo.HojasCargadas[global.SheetInfo.DatosExternos[keyd]["id_hoja"]][global.SheetInfo.DatosExternos[keyd]["id_tab"]][keyf][global.SheetInfo.DatosExternos[keyd]["columna"]]!=undefined && global.SheetInfo.HojasCargadas[global.SheetInfo.DatosExternos[keyd]["id_hoja"]][global.SheetInfo.DatosExternos[keyd]["id_tab"]][keyf][global.SheetInfo.DatosExternos[keyd]["columna"]]!="-"){
                                parametros +=
                                  "{" +
                                  '"text": {' +
                                  '"type": "plain_text",' +
                                  '"text": ' +
                                  '"' +
                                  global.SheetInfo.HojasCargadas[global.SheetInfo.DatosExternos[keyd]["id_hoja"]][global.SheetInfo.DatosExternos[keyd]["id_tab"]][keyf][global.SheetInfo.DatosExternos[keyd]["columna"]] +
                                  '"' +
                                  "}," +
                                  '"value": ' +  
                                  '"' +
                                  global.SheetInfo.HojasCargadas[global.SheetInfo.DatosExternos[keyd]["id_hoja"]][global.SheetInfo.DatosExternos[keyd]["id_tab"]][keyf][global.SheetInfo.DatosExternos[keyd]["columna"]] +
                                  '"' +
                                  "},";
            }
            valoranterior=global.SheetInfo.HojasCargadas[global.SheetInfo.DatosExternos[keyd]["id_hoja"]][global.SheetInfo.DatosExternos[keyd]["id_tab"]][keyf][global.SheetInfo.DatosExternos[keyd]["columna"]];
          } 
        }
      }  
    
    
    
    
    global.block_suggestion_response = '{"options": [' + parametros.substring(0, parametros.length - 1) + "]}";
     res.send(JSON.parse(global.block_suggestion_response));
    
}
  
  if (JSON.parse(req.body.payload).type == "shortcut") {
    const trigger_id = JSON.parse(req.body.payload).trigger_id;
    const callback_id = JSON.parse(req.body.payload).callback_id;
    const token = JSON.parse(req.body.payload).token
    const hash = JSON.parse(req.body.payload).action_ts;
    
    var form, Comando, id_hoja_registro, id_tab_registro;
    global.SheetInfo["Hoja1"].forEach(comando => {
      if (comando.comando == callback_id) {
         form = comando.formulario;
         Comando = comando.comando;
         id_hoja_registro = comando.id_hoja_registro;
         id_tab_registro = comando.id_tab_registro;
      } 
    });
    // console.log(form);
    form=FechaActual(JSON.parse(form));
    const urlToSend = "https://slack.com/api/views.open?token="+process.env.SLACK_BOT_TOKEN+"&trigger_id="+trigger_id+"&view=" +form;

    axios({
      method: "post",
      url: urlToSend
    }).then(res => {  
        // console.log(res.data);
        // if (!res.data.ok) console.log(res.data);
        global.FormulariosProcesados[res.data.view.hash]=[]
        global.FormulariosProcesados[res.data.view.hash]["FormularioEnviadoaASalck"] = res.data.view;
        global.FormulariosProcesados[res.data.view.hash]["FormularioRecibidoDeGoogleSpredSheet"] = res.data.view;
        global.FormulariosProcesados[res.data.view.hash]["Comando"] = Comando;
        global.FormulariosProcesados[res.data.view.hash]["id_hoja_registro"] = id_hoja_registro;
        global.FormulariosProcesados[res.data.view.hash]["id_tab_registro"] = id_tab_registro;
         
      })
      .catch(function(reason) {   
         console.log(reason.response.data);
      });
  }

  if (JSON.parse(req.body.payload).type == "block_actions") {
    const hash = JSON.parse(req.body.payload).view.hash;
    const action = JSON.parse(req.body.payload).actions;
    // FormulariosProcesados
  }

  if (JSON.parse(req.body.payload).type == "view_submission") {
    // console.log(JSON.parse(req.body.payload));
    // const result=JSON.parse(req.body.payload).view.state;
    // for (var key in result) {
    // }
  }
});

function FechaActual(form){
  for(var key in form.blocks){
    if(form.blocks[key].element!=undefined){
    if(form.blocks[key].element.type=='datepicker'){
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
        var yyyy = today.getFullYear();

        today = yyyy + '-' + mm + '-' +dd;

        form.blocks[key].element.initial_date=today;
      }
    }
  }
  return JSON.stringify(form);
}


// Tell our app to listen on port 3000
express.listen(3000, function(err) {
  if (err) {
    throw err;
  }
  console.log("Server started on port 3000");
});

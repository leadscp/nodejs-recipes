#!/usr/bin/env Node

const program = require('commander')
const unirest = require('unirest')
const inquirer = require('inquirer')
const fs = require('fs')

// Création du profil utilisateur
function createProfile () {
    var loop = true

    var name = [{
        type: 'input',
        message: 'What\'s your firstname ?',
        name: 'firstname'
    }, {
        type: 'input',
        message: 'What\'s your lastname ?',
        name: 'lastname'
    }]

    return inquirer.prompt(name).then((identity) => {
        inquirer.prompt([
            {
                type: 'list',
                message: `Are you ${identity.firstname} ${identity.lastname} ?`,
                name: 'confirmation',
                choices: ['Yes I am !', 'Not at all...']
            }
        ]).then((profile) => {
            if(profile.confirmation == 'Yes I am !') { 
                loop = false
                process.stdout.write(`\n Nice to meet you ${identity.firstname} ${identity.lastname} ! \n`)
            }
            if(loop == true) {
                createProfile()
            }
        })
    })
}

// Ajout des favoris 
function setFavorites(cuisine, diet, excludeIngredients, intolerances, numberResult) {
    inquirer.prompt([
        {
            type: 'list',
            message: '1) Choose the cuisine you want to eat : ',
            name: 'cuisine',
            choices: ['Chinese', 'Japanese', 'Vietnamese', 'Thai', 'Indian', 'Mexican', 'American', 'French', 'European', 'Spanish']
        }
    ])
    
    unirest.get("https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/search?diet=vegetarian&excludeIngredients=coconut&intolerances=egg%2C+gluten&limitLicense=false&number=10&offset=0&query=burger&type=main+course")
    .header("X-Mashape-Key", "mnuIxvIQSamshydbUwjdW6RTqapVp1J5b4YjsnJF4NF7n9uRi5")
    .header("Accept", "application/json")
    .end(function (result) {
        //console.log(result.status, result.headers, result.body);
    });
}

createProfile().end((name) => {
    setFavorites()
})
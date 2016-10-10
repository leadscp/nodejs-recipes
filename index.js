#!/usr/bin/env Node

const program = require('commander')
const unirest = require('unirest')
const inquirer = require('inquirer')
const fs = require('fs')
const db = require('sqlite')

// Création du profil utilisateur
function createProfile () {
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
        return confirmationProfile(identity.firstname, identity.lastname);
    })
}

// Confirmation du prénom et du nom
function confirmationProfile(firstname, lastname) {
    return inquirer.prompt([
        {
            type: 'list',
            message: `Are you ${firstname} ${lastname} ?`,
            name: 'confirmation',
            choices: ['Yes I am !', 'Not at all...']
        }
    ]).then((profile) => {
        if(profile.confirmation == 'Yes I am !') {  
            process.stdout.write(`\n >> Nice to meet you ! \n \n`)
            saveDB(firstname, lastname);
        } else {
            return createProfile()
        }
    })
}

// Ajout des spécialités cuisines
function setCuisine() {
    return inquirer.prompt([
        {
            type: 'checkbox',
            message: '1) Choose your favorite(s) cuisine(s) : ',
            name: 'cuisine',
            choices: ['Chinese', 'Japanese', 'Vietnamese', 'Thai', 'Indian', 'Mexican', 'American', 'French', 'European', 'Spanish']
        }
    ])
}

// Ajout des intolerances
function setIntolerance() {
    return inquirer.prompt([
        {
            type: 'checkbox',
            message: '2) Any intolerance(s) ? (If you don\'t have any intolerance, please press <enter>)',
            name: 'intolerances',
            choices: ['Egg', 'Gluten', 'Peanut', 'Sesame', 'Seafood', 'Soy', 'Wheat', 'Tree nut', 'Shellfish', 'Sulfite']
        }
    ])
}

// Ajout du régime alimentaire
function setDiet() {
    return inquirer.prompt([
        {
            type: 'list',
            message: '3) Let\'s talk about your diet... (If you don\'t have any diet, please press <enter>)',
            name: 'diet',
            choices: ['Vegetarian', 'Pescetarian', 'Lacto vegetarian', 'Ovo vegetarian', 'Vegan']
        }
    ])
}

// Appel de l'API
function callApi() {
    return setCuisine().then((res) => {
        setIntolerance().then((res2) => {
            setDiet().then((res3) => {
                var tabIntolerances = []
                var tabCuisine = []

                for(var i = 0; i < res2['intolerances'].length; i++) {
                    tabIntolerances += res2['intolerances'][i] + '%2C+'
                }

                for(var i = 0; i < res['cuisine'].length; i++) {
                    tabCuisine += res['cuisine'][i] + '%2C+'
                }

                unirest.get(`https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/search?
                diet${res3['diet']}
                &cuisine=${tabCuisine}
                &intolerances=${tabIntolerances}
                &limitLicense=false
                &type=main+course`)
                .header("X-Mashape-Key", "mnuIxvIQSamshydbUwjdW6RTqapVp1J5b4YjsnJF4NF7n9uRi5")
                .header("Accept", "application/json")
                .end(function (result) {
                    var resultFile = []
                    var recipes = result.body

                    for(var i = 0; i < recipes['results'].length; i++) {
                        unirest.get(`https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/${recipes['results'][i]['id']}/information?includeNutrition=false`)
                        .header("X-Mashape-Key", "mnuIxvIQSamshydbUwjdW6RTqapVp1J5b4YjsnJF4NF7n9uRi5")
                        .header("Accept", "application/json")
                        .end(function (res) {
                            var details = res.body

                            resultFile += details['title'] + "\n"
                                    + 'Ready in : ' + details['readyInMinutes'] + " minutes \n"
                                    + 'Instructions : ' + details['instructions'] + "\n"
                                    + 'Lien source : ' + details['sourceUrl'] + "\n \n"

                            return saveFile(resultFile)
                        })
                    }
                })
            })
        })
    })    
}

// Ouvre la BDD 
function openDB() {
    return db.open('recipes.db').then(() => {
        return db.run('CREATE TABLE IF NOT EXISTS users (firstname, lastname)')
    }).catch((err) => {
        console.error('ERR > ', err)
    })
}

// Sauvegarde en BDD
function saveDB(firstname, lastname) {
    return db.run('INSERT INTO users VALUES (?, ?)', firstname, lastname)
}

// Ajouter les recettes dans un fichier
function saveFile(recipes) {
    try {
        fs.writeFile('recipes.txt', resultFile, (err) => {
            if(err) throw err
            console.log('Fichier écrit')
        })

        fs.readFile('recipes.txt', 'utf8', (err, data) => {
            if(err) throw err
            console.log('Données du fichier : ' + data)
        }) 
    } catch(err) {
        console.error('ERROR > ', err)
    }
}

openDB().then((data) => {
    return createProfile().then((res) => {
        return callApi()
    })
})


// TODO
// - Fichiers : Faire des sauts à la ligne
// - Nombre de données à l'affichage 
// - Faire un README

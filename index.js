#!/usr/bin/env Node

const program = require('commander')
const unirest = require('unirest')
const inquirer = require('inquirer')
const fs = require('fs')
const db = require('sqlite')

// Création du profil utilisateur avec le prénom et le nom de famille
function createProfile () {
    var name = [{
        type: 'input',
        message: 'What\'s your firstname ?',
        name: 'firstname',
        validate: function(firstname) {
            return firstname != ''
        }
    }, {
        type: 'input',
        message: 'What\'s your lastname ?',
        name: 'lastname',
        validate: function(lastname) {
            return lastname != ''
        }
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
            choices: ['Vietnamese', 'Chinese', 'Japanese', 'Thai', 'Indian', 'Mexican', 'American', 'French', 'European', 'Spanish']
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
            choices: ['Vegetarian', 'Pescetarian', 'Lacto vegetarian', 'Ovo vegetarian', 'Vegan', 'Om nom nom, I eat everything !']
        }
    ])
}

// Requête permettant d'acéder à l'API à partir de l'ID de la recette
// Permet ainsi de récupérer plus d'informations : Descripton, lien source...
function rq(id) {
    return new Promise((resolve, reject) => {
        unirest.get(`https://spoonacular-recipe-food-nutrition-v1.p.mashape.com/recipes/${id}/information?includeNutrition=false`)
        .header("X-Mashape-Key", "mnuIxvIQSamshydbUwjdW6RTqapVp1J5b4YjsnJF4NF7n9uRi5")
        .header("Accept", "application/json")
        .end(function (res) {
            resolve(res.body)
        })
    })
}

// Appel de l'API spoonacular avec unirest
function callApi() {
    return setCuisine().then((res) => {
        setIntolerance().then((res2) => {
            setDiet().then((res3) => {
                var tabIntolerances = []
                var tabCuisine = []
                var resultFile = []

                // Traitement des résultats inscrit par l'utilisateur
                // Pour pouvoir les mettre dans l'URL
                for(var i = 0; i < res2['intolerances'].length; i++) {
                    tabIntolerances += res2['intolerances'][i] + '%2C+'
                }

                for(var i = 0; i < res['cuisine'].length; i++) {
                    tabCuisine += res['cuisine'][i] + '%2C+'
                }

                if(res3 == 'Om nom nom, I eat everything') {
                    res3 = ''
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
                    var recipes = result.body
                    var promises = []
                    var compteur = 0 
                    var compteurMax = recipes['results'].length - 1

                    // Permet de récupérer les recettes de manière récursive
                    getRecipes(promises, compteur, compteurMax, recipes)
                })
            })
        })
    })    
}

// Ouvre la BDD 
// Crée la table si n'existe pas
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

// Ajouter les recettes dans un dossier
// Chaque recette a son fichier avec son intitulé
function saveFile(recipes, fsTitle) {
    try {
        try {
            fs.readdirSync('Recipes/')
        } catch(err) {
            fs.mkdirSync('Recipes/')
        }

        fs.writeFile(`Recipes/${fsTitle}.txt`, recipes, (err) => {
            
        })
    } catch(err) {
        console.error('ERROR > ', err)
    } finally {
        console.log('\n' + fsTitle);
    }
}

// Afficher la lste des recettes déjà existantes
function existRecipes() {
    try {
        var allRecipes = fs.readdirSync('Recipes/')
    } catch(err) {
        console.error('ERROR > ', err)
    } finally {
        console.log(allRecipes.join("\r\n"))
    }
}

// Rajoute les recettes dans une liste
// Fonction appelé dans callApi()
function getRecipes(list, cpt, idMax, recipe) {
    var requete = rq(recipe['results'][cpt]['id'])

    requete.then((res) => {
        list = (res['title'] + "\r\n"
                + 'Ready in : ' + res['readyInMinutes'] + " minutes \r\n"
                + 'Instructions : ' + res['instructions'] + "\r\n"
                + 'Source : ' + res['sourceUrl'] + "\r\n\n\n")

        saveFile(list, res['title'])
        cpt ++
        
        if(cpt < idMax){
            getRecipes(list, cpt, idMax, recipe)
        }

        if (cpt == idMax) {
            console.log("\r\n BON APPETIT !")
        }
    })
}

// Lire le README.txt
function readMe() {
    fs.readFile('README.txt', 'utf8', (err, data) => {
        if(err) throw err
        console.log(data)
    }) 
}

// Utilisation de commander
program
    .version('1.0.0')
    .option('-c, --cook', 'Are you ready ? Add --cook for cooking with me !')
    .option('-r, --recipes', 'All your delicious recipes...')
    .option('-e, --explications', 'Need some explications ?')
    .option('-a, --author', 'Here is my credit !')

program.parse(process.argv)

// Les actions pour le commander selon les différentes actions
if(program.cook) {
    console.log('')
    openDB().then((data) => {
        return createProfile().then((res) => {
            return callApi()
        })
    })
} else if(program.explications) {
    readMe();
} else if(program.author) {
    console.log(`FOOD RECIPES CLI - Léa DESCHAMPS, Ingésup B3A`)
} else if (program.recipes) {
    existRecipes()
} else {
    program.help()
}
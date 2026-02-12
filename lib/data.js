const fs = require('fs');
const path = require('path');

const rawPets = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'pets.json')));
const PETS = {};
for (const pet of rawPets) {
  PETS[pet.Id] = pet;
}

const rawPerks = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'perks.json')));
const PERKS = {};
for (const perk of rawPerks) {
  PERKS[perk.Id] = perk;
}

const rawToys = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'toys.json')));
const TOYS = {};
for (const toy of rawToys) {
  TOYS[toy.Id] = toy;
}

module.exports = {
  PETS,
  PERKS,
  TOYS
};

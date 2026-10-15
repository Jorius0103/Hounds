"""
Gera um CSV com todas as ADVANTAGES dos seus livros GURPS:
livro; pagina; advantage; custo; tipo; descricao (texto completo, lido dos seus PDFs).

Uso:
    pip install pdfplumber
    python extrair_advantages.py
    python extrair_advantages.py --pasta "C:\\outra\\pasta" --saida vantagens.csv

O CSV usa ";" e UTF-8 com BOM, para abrir direto no Excel em português.
"""
import argparse, csv, gc, re, sys, unicodedata
from collections import Counter
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    sys.exit("Instale antes:  pip install pdfplumber")

PASTA_PADRAO = Path(r"C:\Users\junior\Desktop\Hounds\Hounds\Gurps")

# chave: (nome exibido, função que reconhece o arquivo, deslocamento página PDF - página impressa)
LIVROS = {
    "basic":      ("GURPS Basic Set (4th ed.)",      lambda n: "basic" in n, 2),
    "ma":         ("GURPS Martial Arts",             lambda n: "martial" in n and "gladiator" not in n, 1),
    "gladiators": ("GURPS Martial Arts: Gladiators", lambda n: "gladiator" in n, 0),
    "fantasy":    ("GURPS Fantasy",                  lambda n: "fantasy" in n, 2),
    "lowtech":    ("GURPS Low-Tech",                 lambda n: "low-tech" in n and not any(
                        x in n for x in ("instant", "loadout", "companion")), 2),
}

# (livro, página impressa, advantage, custo, tipo)
DADOS = [
('basic', 34, '360° Vision', '25 points', 'Advantage'),
('basic', 34, '3D Spatial Sense', '10 points (enhanced level of Absolute Direction)', 'Advantage'),
('basic', 34, 'Absolute Direction', '5 or 10 points', 'Advantage'),
('basic', 35, 'Absolute Timing', '2 or 5 points', 'Advantage'),
('basic', 35, 'Acute Senses', '2 points/level', 'Advantage'),
('basic', 35, 'Administrative Rank', '5 points/level (see p. B29)', 'Cross-reference'),
('basic', 35, 'Affliction', '10 points/level', 'Advantage'),
('basic', 36, 'Allies', 'Variable', 'Advantage'),
('basic', 38, 'Altered Time Rate', '100 points/level', 'Advantage'),
('basic', 39, 'Alternate Identity', '5 or 15 points per identity', 'Advantage'),
('basic', 39, 'Ambidexterity', '5 points', 'Advantage'),
('basic', 40, 'Amphibious', '10 points', 'Advantage'),
('basic', 40, 'Animal Empathy', '5 points', 'Advantage'),
('basic', 40, 'Animal Friend', '5 points/level (Talent, see p. B89)', 'Cross-reference'),
('basic', 40, 'Appearance', 'Variable (see p. B21)', 'Cross-reference'),
('basic', 40, 'Arm DX', '12 or 16 points per +1 DX', 'Advantage'),
('basic', 40, 'Arm ST', '3, 5 or 8 points per +1 ST', 'Advantage'),
('basic', 40, 'Artificer', '10 points/level (Talent, see p. B89)', 'Cross-reference'),
('basic', 40, 'Binding', '2 points/level', 'Advantage'),
('basic', 40, 'Blessed', '10 or more points', 'Advantage'),
('basic', 41, 'Brachiator', '5 points', 'Advantage'),
('basic', 41, 'Breath-Holding', '2 points/level', 'Advantage'),
('basic', 41, 'Business Acumen', '10 points/level (Talent, see p. B89)', 'Cross-reference'),
('basic', 41, 'Catfall', '10 points', 'Advantage'),
('basic', 41, 'Chameleon', '5 points/level', 'Advantage'),
('basic', 41, 'Channeling', '10 points', 'Advantage'),
('basic', 41, 'Charisma', '5 points/level', 'Advantage'),
('basic', 41, 'Chronolocation', '5 points (enhanced level of Absolute Timing, see p. B35)', 'Cross-reference'),
('basic', 41, 'Claim to Hospitality', '1 to 10 points', 'Advantage'),
('basic', 42, 'Clairsentience', '50 points', 'Advantage'),
('basic', 42, 'Claws', 'Variable', 'Advantage'),
('basic', 43, 'Clerical Investment', '5 points', 'Advantage'),
('basic', 43, 'Clinging', '20 points', 'Advantage'),
('basic', 43, 'Combat Reflexes', '15 points', 'Advantage'),
('basic', 43, 'Common Sense', '10 points', 'Advantage'),
('basic', 43, 'Compartmentalized Mind', '50 points/level', 'Advantage'),
('basic', 43, 'Constriction Attack', '15 points', 'Advantage'),
('basic', 44, 'Contact Group', 'Variable', 'Advantage'),
('basic', 44, 'Contacts', 'Variable', 'Advantage'),
('basic', 46, 'Courtesy Rank', '1 point/level (see p. B29)', 'Cross-reference'),
('basic', 46, 'Cultural Adaptability', '10 or 20 points', 'Advantage'),
('basic', 46, 'Cultural Familiarity', '1 or 2 points per culture (see p. B23)', 'Cross-reference'),
('basic', 46, 'Cybernetics', 'Variable', 'Advantage'),
('basic', 46, 'Damage Resistance', '5 points/level', 'Advantage'),
('basic', 47, 'Danger Sense', '15 points', 'Advantage'),
('basic', 47, 'Daredevil', '15 points', 'Advantage'),
('basic', 47, 'Dark Vision', '25 points', 'Advantage'),
('basic', 48, 'Destiny', 'Variable', 'Advantage'),
('basic', 48, 'Detect', 'Variable', 'Advantage'),
('basic', 48, 'Digital Mind', '5 points', 'Advantage'),
('basic', 49, 'Discriminatory Hearing', '15 points', 'Advantage'),
('basic', 49, 'Discriminatory Smell', '15 points', 'Advantage'),
('basic', 49, 'Discriminatory Taste', '10 points', 'Advantage'),
('basic', 49, "Doesn't Breathe", '20 points', 'Advantage'),
('basic', 50, "Doesn't Eat or Drink", '10 points', 'Advantage'),
('basic', 50, "Doesn't Sleep", '20 points', 'Advantage'),
('basic', 50, 'Dominance', '20 points', 'Advantage'),
('basic', 50, 'Double-Jointed', '15 points (see Flexibility, p. B56)', 'Cross-reference'),
('basic', 50, 'Duplication', '35 points/copy', 'Advantage'),
('basic', 51, 'Eidetic Memory', '5 or 10 points', 'Advantage'),
('basic', 51, 'Elastic Skin', '20 points', 'Advantage'),
('basic', 51, 'Empathy', '5 or 15 points', 'Advantage'),
('basic', 51, 'Enhanced Defenses', 'Variable', 'Advantage'),
('basic', 52, 'Enhanced Move', '20 points/level', 'Advantage'),
('basic', 52, 'Enhanced Time Sense', '45 points', 'Advantage'),
('basic', 53, 'Enhanced Tracking', '5 points/level', 'Advantage'),
('basic', 53, 'Extended Lifespan', '2 points/level', 'Advantage'),
('basic', 53, 'Extra Arms', 'Variable', 'Advantage'),
('basic', 53, 'Extra Attack', '25 points/attack', 'Advantage'),
('basic', 54, 'Extra Head', '15 points/head', 'Advantage'),
('basic', 54, 'Extra Legs', 'Variable', 'Advantage'),
('basic', 55, 'Extra Life', '25 points/life', 'Advantage'),
('basic', 55, 'Extra Mouth', '5 points/mouth', 'Advantage'),
('basic', 55, 'Fashion Sense', '5 points (see p. B21)', 'Cross-reference'),
('basic', 55, 'Favor', 'Variable', 'Advantage'),
('basic', 55, 'Fearlessness', '2 points/level', 'Advantage'),
('basic', 55, 'Filter Lungs', '5 points', 'Advantage'),
('basic', 55, 'Fit', '5 or 15 points', 'Advantage'),
('basic', 56, 'Flexibility', '5 or 15 points', 'Advantage'),
('basic', 56, 'Flight', '40 points', 'Advantage'),
('basic', 56, 'Gadgeteer', '25 or 50 points', 'Advantage'),
('basic', 57, 'G-Experience', '1 to 10 points', 'Advantage'),
('basic', 57, 'Gifted Artist', '5 points/level (Talent, see p. B89)', 'Cross-reference'),
('basic', 57, 'Gizmos', '5 points/gizmo', 'Advantage'),
('basic', 58, 'Green Thumb', '5 points/level (Talent, see p. B89)', 'Cross-reference'),
('basic', 58, 'Growth', '10 points/level', 'Advantage'),
('basic', 58, 'Gunslinger', '25 points', 'Advantage'),
('basic', 58, 'Hard to Kill', '2 points/level', 'Advantage'),
('basic', 59, 'Hard to Subdue', '2 points/level', 'Advantage'),
('basic', 59, 'Healer', '10 points/level (Talent, see p. B89)', 'Cross-reference'),
('basic', 59, 'Healing', '30 points', 'Advantage'),
('basic', 59, 'Hermaphromorph', '5 points', 'Advantage'),
('basic', 59, 'High Manual Dexterity', '5 points/level', 'Advantage'),
('basic', 59, 'High Pain Threshold', '10 points', 'Advantage'),
('basic', 59, 'High TL', '5 points/level (see p. B23)', 'Cross-reference'),
('basic', 59, 'Higher Purpose', '5 points', 'Advantage'),
('basic', 60, 'Hyperspectral Vision', '25 points', 'Advantage'),
('basic', 60, 'Illuminated', '15 points', 'Advantage'),
('basic', 60, 'Improved G-Tolerance', '5 to 25 points', 'Advantage'),
('basic', 60, 'Independent Income', '1 point/level (see p. B26)', 'Cross-reference'),
('basic', 60, 'Indomitable', '15 points', 'Advantage'),
('basic', 60, 'Infravision', '0 or 10 points', 'Advantage'),
('basic', 60, 'Injury Tolerance', 'Variable', 'Advantage'),
('basic', 61, 'Innate Attack', 'Variable', 'Advantage'),
('basic', 62, 'Insubstantiality', '80 points', 'Advantage'),
('basic', 63, 'Intuition', '15 points', 'Advantage'),
('basic', 63, 'Intuitive Mathematician', '5 points (enhanced level of Lightning Calculator, see p. B66)', 'Cross-reference'),
('basic', 63, 'Invisibility', '40 points', 'Advantage'),
('basic', 64, 'Jumper', '100 points', 'Advantage'),
('basic', 65, 'Language Talent', '10 points', 'Advantage'),
('basic', 65, 'Legal Enforcement Powers', '5, 10 or 15 points', 'Advantage'),
('basic', 65, 'Legal Immunity', '5 to 20 points', 'Advantage'),
('basic', 65, 'Less Sleep', '2 points/level', 'Advantage'),
('basic', 65, 'Lifting ST', '3 points per +1 ST', 'Advantage'),
('basic', 66, 'Lightning Calculator', '2 or 5 points', 'Advantage'),
('basic', 66, 'Longevity', '2 points', 'Advantage'),
('basic', 66, 'Luck', 'Variable', 'Advantage'),
('basic', 66, 'Magery', '5 points for Magery 0, +10 points/level', 'Advantage'),
('basic', 67, 'Magic Resistance', '2 points/level', 'Advantage'),
('basic', 67, 'Mana Damper', '10 points/level', 'Advantage'),
('basic', 68, 'Mana Enhancer', '50 points/level', 'Advantage'),
('basic', 68, 'Mathematical Ability', '10 points/level (Talent, see p. B89)', 'Cross-reference'),
('basic', 68, 'Medium', '10 points', 'Advantage'),
('basic', 68, 'Merchant Rank', '5 points/level (see p. B29)', 'Cross-reference'),
('basic', 68, 'Metabolism Control', '5 points/level', 'Advantage'),
('basic', 68, 'Microscopic Vision', '5 points/level', 'Advantage'),
('basic', 68, 'Military Rank', '5 points/level (see p. B29)', 'Cross-reference'),
('basic', 68, 'Mimicry', '10 points', 'Advantage'),
('basic', 68, 'Mind Control', '50 points', 'Advantage'),
('basic', 69, 'Mind Probe', '20 points', 'Advantage'),
('basic', 69, 'Mind Reading', '30 points', 'Advantage'),
('basic', 70, 'Mind Shield', '4 points/level', 'Advantage'),
('basic', 70, 'Mindlink', 'Variable', 'Advantage'),
('basic', 71, 'Modular Abilities', 'Variable', 'Advantage'),
('basic', 71, 'Musical Ability', '5 points/level (Talent, see p. B89)', 'Cross-reference'),
('basic', 71, 'Neutralize', '50 points', 'Advantage'),
('basic', 71, 'Nictitating Membrane', '1 point/level', 'Advantage'),
('basic', 71, 'Night Vision', '1 point/level', 'Advantage'),
('basic', 72, 'Obscure', '2 points/level', 'Advantage'),
('basic', 72, 'Oracle', '15 points', 'Advantage'),
('basic', 72, 'Outdoorsman', '10 points/level (Talent, see p. B89)', 'Cross-reference'),
('basic', 72, 'Parabolic Hearing', '4 points/level', 'Advantage'),
('basic', 72, 'Patrons', 'Variable', 'Advantage'),
('basic', 74, 'Payload', '1 point/level', 'Advantage'),
('basic', 74, 'Penetrating Vision', '10 points/level', 'Advantage'),
('basic', 74, 'Perfect Balance', '15 points', 'Advantage'),
('basic', 74, 'Peripheral Vision', '15 points', 'Advantage'),
('basic', 75, 'Permeation', 'Variable', 'Advantage'),
('basic', 75, 'Photographic Memory', '10 points (enhanced level of Eidetic Memory, see p. B51)', 'Cross-reference'),
('basic', 75, 'Pitiable', '5 points (see p. B22)', 'Cross-reference'),
('basic', 75, 'Plant Empathy', '5 points', 'Advantage'),
('basic', 75, 'Police Rank', '5 points/level (see p. B29)', 'Cross-reference'),
('basic', 75, 'Possession', '100 points', 'Advantage'),
('basic', 77, 'Power Investiture', '10 points/level', 'Advantage'),
('basic', 77, 'Precognition', '25 points', 'Advantage'),
('basic', 77, 'Pressure Support', '5 to 15 points', 'Advantage'),
('basic', 78, 'Protected Sense', '5 points/sense', 'Advantage'),
('basic', 78, 'Psi Static', '30 points', 'Advantage'),
('basic', 78, 'Psychometry', '20 points', 'Advantage'),
('basic', 78, 'Puppet', '5 or 10 points', 'Advantage'),
('basic', 78, 'Racial Memory', '15 or 40 points', 'Advantage'),
('basic', 79, 'Radiation Tolerance', 'Variable', 'Advantage'),
('basic', 79, 'Rank', '5 points/level (see p. B29)', 'Cross-reference'),
('basic', 79, 'Rapid Healing', '5 or 15 points', 'Advantage'),
('basic', 79, 'Rapier Wit', '5 points', 'Advantage'),
('basic', 80, 'Reawakened', '10 points', 'Advantage'),
('basic', 80, 'Recovery', '10 points', 'Advantage'),
('basic', 80, 'Reduced Consumption', '2 points/level', 'Advantage'),
('basic', 80, 'Regeneration', 'Variable', 'Advantage'),
('basic', 80, 'Regrowth', '40 points', 'Advantage'),
('basic', 80, 'Religious Rank', '5 points/level (see p. B29)', 'Cross-reference'),
('basic', 80, 'Reputation', 'Variable (see p. B26)', 'Cross-reference'),
('basic', 80, 'Resistant', 'Variable', 'Advantage'),
('basic', 81, 'Scanning Sense', 'Variable', 'Advantage'),
('basic', 82, 'Sealed', '15 points', 'Advantage'),
('basic', 82, 'Security Clearance', 'Variable', 'Advantage'),
('basic', 83, 'See Invisible', '15 points', 'Advantage'),
('basic', 83, 'Sensitive', '5 points (lesser version of Empathy, see p. B51)', 'Cross-reference'),
('basic', 83, 'Sensitive Touch', '10 points', 'Advantage'),
('basic', 83, 'Serendipity', '15 points/level', 'Advantage'),
('basic', 83, 'Shadow Form', '50 points', 'Advantage'),
('basic', 83, 'Shapeshifting', 'Variable', 'Advantage'),
('basic', 85, 'Shrinking', '5 points/level', 'Advantage'),
('basic', 85, 'Signature Gear', 'Variable', 'Advantage'),
('basic', 85, 'Silence', '5 points/level', 'Advantage'),
('basic', 85, 'Single-Minded', '5 points', 'Advantage'),
('basic', 85, 'Slippery', '2 points/level', 'Advantage'),
('basic', 85, 'Smooth Operator', '15 points/level (Talent, see p. B89)', 'Cross-reference'),
('basic', 86, 'Snatcher', '80 points', 'Advantage'),
('basic', 86, 'Social Chameleon', '5 points', 'Advantage'),
('basic', 86, 'Social Regard', '5 points per +1 reaction', 'Advantage'),
('basic', 87, 'Speak Underwater', '5 points', 'Advantage'),
('basic', 87, 'Speak With Animals', '25 points', 'Advantage'),
('basic', 87, 'Speak With Plants', '15 points', 'Advantage'),
('basic', 88, 'Special Rapport', '5 points', 'Advantage'),
('basic', 88, 'Spines', '1 or 3 points', 'Advantage'),
('basic', 88, 'Spirit Empathy', '10 points', 'Advantage'),
('basic', 88, 'Status', '5 points/level (see p. B28)', 'Cross-reference'),
('basic', 88, 'Stretching', '6 points/level', 'Advantage'),
('basic', 88, 'Striker', '5, 6, 7 or 8 points', 'Advantage'),
('basic', 88, 'Striking ST', '5 points per +1 ST', 'Advantage'),
('basic', 89, 'Subsonic Hearing', '0 or 5 points', 'Advantage'),
('basic', 89, 'Subsonic Speech', '0 or 10 points', 'Advantage'),
('basic', 89, 'Super Climbing', '3 points/level', 'Advantage'),
('basic', 89, 'Super Jump', '10 points/level', 'Advantage'),
('basic', 89, 'Super Luck', '100 points', 'Advantage'),
('basic', 89, 'Supernatural Durability', '150 points', 'Advantage'),
('basic', 89, 'Talent', 'Variable', 'Talent'),
('basic', 91, 'Teeth', '0, 1 or 2 points', 'Advantage'),
('basic', 91, 'Telecommunication', 'Variable', 'Advantage'),
('basic', 92, 'Telekinesis', '5 points/level', 'Advantage'),
('basic', 92, 'Telescopic Vision', '5 points/level', 'Advantage'),
('basic', 92, 'Temperature Control', '5 points/level', 'Advantage'),
('basic', 93, 'Temperature Tolerance', '1 point/level', 'Advantage'),
('basic', 93, 'Temporal Inertia', '15 points', 'Advantage'),
('basic', 93, 'Temporary Rank', 'Variable (see p. B29)', 'Cross-reference'),
('basic', 93, 'Tenure', '5 points', 'Advantage'),
('basic', 93, 'Terrain Adaptation', '0 or 5 points', 'Advantage'),
('basic', 93, 'Terror', '30 points + 10 points per -1 to Fright Check', 'Advantage'),
('basic', 93, 'Trained By A Master', '30 points', 'Advantage'),
('basic', 94, 'True Faith', '15 points', 'Advantage'),
('basic', 94, 'Tunneling', '30 points + 5 points per point of Tunneling Move', 'Advantage'),
('basic', 94, 'Ultrahearing', '0 or 5 points', 'Advantage'),
('basic', 94, 'Ultrasonic Speech', '0 or 10 points', 'Advantage'),
('basic', 94, 'Ultravision', '0 or 10 points', 'Advantage'),
('basic', 95, 'Unaging', '15 points', 'Advantage'),
('basic', 95, 'Unfazeable', '15 points', 'Advantage'),
('basic', 95, 'Universal Digestion', '5 points', 'Advantage'),
('basic', 95, 'Unkillable', '50 to 150 points', 'Advantage'),
('basic', 96, 'Unusual Background', 'Variable', 'Advantage'),
('basic', 96, 'Vacuum Support', '5 points', 'Advantage'),
('basic', 96, 'Vampiric Bite', '30 points + 5 points per extra HP drained', 'Advantage'),
('basic', 96, 'Versatile', '5 points', 'Advantage'),
('basic', 96, 'Very Fit', '15 points (see Fit, p. B55)', 'Cross-reference'),
('basic', 96, 'Very Rapid Healing', '15 points (see Rapid Healing, p. B79)', 'Cross-reference'),
('basic', 96, 'Vibration Sense', '10 points', 'Advantage'),
('basic', 96, 'Visualization', '10 points', 'Advantage'),
('basic', 97, 'Voice', '10 points', 'Advantage'),
('basic', 97, 'Walk on Air', '20 points', 'Advantage'),
('basic', 97, 'Walk on Liquid', '15 points', 'Advantage'),
('basic', 97, 'Warp', '100 points', 'Advantage'),
('basic', 99, 'Wealth', 'Variable (see p. B25)', 'Cross-reference'),
('basic', 99, 'Weapon Master', 'Variable', 'Advantage'),
('basic', 99, 'Wild Talent', '20 points/level', 'Advantage'),
('basic', 100, 'Xeno-Adaptability', '20 points (see Cultural Adaptability, p. B46)', 'Cross-reference'),
('basic', 100, 'Zeroed', '10 points', 'Advantage'),
('ma', 42, 'Altered Time Rate', 'see p. B38', 'Expansion (Basic Set advantage)'),
('ma', 42, 'Claws', 'see p. B42', 'Expansion (Basic Set advantage)'),
('ma', 43, 'Damage Resistance', 'see p. B46', 'Expansion (Basic Set advantage)'),
('ma', 43, 'Enhanced Defenses', 'see p. B51', 'Expansion (Basic Set advantage)'),
('ma', 44, 'Enhanced Time Sense', 'see p. B52', 'Expansion (Basic Set advantage)'),
('ma', 44, 'Extra Attack', 'see p. B53', 'Expansion (Basic Set advantage)'),
('ma', 44, 'Fearlessness', 'see p. B55', 'Expansion (Basic Set advantage)'),
('ma', 44, 'Flexibility', 'see p. B56', 'Expansion (Basic Set advantage)'),
('ma', 45, 'Gizmos', 'see p. B57', 'Expansion (Basic Set advantage)'),
('ma', 45, 'Gunslinger', 'see p. B58', 'Expansion (Basic Set advantage)'),
('ma', 45, 'Heroic Archer', '20 points', 'Advantage'),
('ma', 45, 'Injury Tolerance', 'see p. B60', 'Expansion (Basic Set advantage)'),
('ma', 45, 'Innate Attack', 'see p. B61', 'Expansion (Basic Set advantage)'),
('ma', 47, 'Regeneration', 'see p. B80', 'Expansion (Basic Set advantage)'),
('ma', 47, 'Resistant', 'see p. B80', 'Expansion (Basic Set advantage)'),
('ma', 47, 'Striker', 'see p. B88', 'Expansion (Basic Set advantage)'),
('ma', 47, 'Talent', 'see p. B89', 'Expansion (Basic Set advantage)'),
('ma', 47, 'Forceful Chi', '15 points/level', 'Talent'),
('ma', 47, 'Inner Balance', '15 points/level', 'Talent'),
('ma', 48, 'Trained by a Master', 'see p. B93', 'Expansion (Basic Set advantage)'),
('ma', 48, 'Weapon Master', 'see p. B99', 'Expansion (Basic Set advantage)'),
('ma', 49, 'Wild Talent', 'see p. B99', 'Expansion (Basic Set advantage)'),
('ma', 49, 'Style Familiarity', '1 point', 'Perk'),
('ma', 49, 'Armor Familiarity', '1 point', 'Perk'),
('ma', 49, 'Biting Mastery', '1 point', 'Perk'),
('ma', 50, 'Chi Resistance', '1 point', 'Perk'),
('ma', 50, 'Cotton Stomach', '1 point', 'Perk'),
('ma', 50, 'Drunken Fighting', '1 point', 'Perk'),
('ma', 50, 'Exotic Weapon Training', '1 point', 'Perk'),
('ma', 50, 'Form Mastery', '1 point', 'Perk'),
('ma', 50, 'Grip Mastery', '1 point', 'Perk'),
('ma', 50, 'Ground Guard', '1 point', 'Perk'),
('ma', 50, 'Improvised Weapons', '1 point', 'Perk'),
('ma', 50, 'Iron Body Parts', '1 point', 'Perk'),
('ma', 50, 'Naval Training', '1 point', 'Perk'),
('ma', 50, 'Neck Control', '1 point', 'Perk'),
('ma', 50, 'Off-Hand Weapon Training', '1 point', 'Perk'),
('ma', 51, 'Power Grappling', '1 point', 'Perk'),
('ma', 51, 'Quick-Sheathe', '1 point', 'Perk'),
('ma', 51, 'Quick-Swap', '1 point', 'Perk'),
('ma', 51, 'Rapid Retraction', '1 point', 'Perk'),
('ma', 51, 'Shield-Wall Training', '1 point', 'Perk'),
('ma', 51, 'Shtick', '1 point', 'Perk'),
('ma', 51, 'Skill Adaptation', '1 point', 'Perk'),
('ma', 51, 'Special Exercises', '1 point', 'Perk'),
('ma', 51, 'Special Setup', '1 point', 'Perk'),
('ma', 51, 'Strongbow', '1 point', 'Perk'),
('ma', 51, 'Style Adaptation', '1 point', 'Perk'),
('ma', 52, 'Suit Familiarity', '1 point', 'Perk'),
('ma', 52, 'Sure-Footed', '1 point', 'Perk'),
('ma', 52, 'Teamwork', '1 point', 'Perk'),
('ma', 52, 'Technique Adaptation', '1 point', 'Perk'),
('ma', 52, 'Technique Mastery', '1 point', 'Perk'),
('ma', 52, 'Unique Technique', '1 point', 'Perk'),
('ma', 52, 'Unusual Training', '1 point', 'Perk'),
('ma', 52, 'Weapon Adaptation', '1 point', 'Perk'),
('ma', 53, 'Weapon Bond', '1 point', 'Perk'),
('fantasy', 128, 'Absolute Direction', 'see p. B34', 'Expansion (Basic Set advantage)'),
('fantasy', 128, 'Acute Senses', 'see p. B35', 'Expansion (Basic Set advantage)'),
('fantasy', 128, 'Allies', 'see pp. B36-38', 'Expansion (Basic Set advantage)'),
('fantasy', 128, 'Blessed', 'see pp. B40-41', 'Expansion (Basic Set advantage)'),
('fantasy', 128, 'Contacts', 'see pp. B44-45', 'Expansion (Basic Set advantage)'),
('fantasy', 128, 'Eidetic Memory', 'see p. B51', 'Expansion (Basic Set advantage)'),
('fantasy', 128, 'Insubstantiality', 'see pp. B62-63', 'Expansion (Basic Set advantage)'),
('fantasy', 129, 'Invisibility', 'see p. B63', 'Expansion (Basic Set advantage)'),
('fantasy', 129, 'Jumper', 'see pp. B64-65', 'Expansion (Basic Set advantage)'),
('fantasy', 129, 'Magery', 'see pp. B66-67', 'Expansion (Basic Set advantage)'),
('fantasy', 130, 'Modular Abilities', 'see p. B71', 'Expansion (Basic Set advantage)'),
('fantasy', 130, 'Night Vision', 'see p. B71', 'Expansion (Basic Set advantage)'),
('fantasy', 130, 'Patron', 'see pp. B72-74', 'Expansion (Basic Set advantage)'),
('fantasy', 130, 'Rank', 'see p. B29', 'Expansion (Basic Set advantage)'),
('fantasy', 130, 'Rapier Wit', 'see p. B79', 'Expansion (Basic Set advantage)'),
('fantasy', 130, 'Security Clearance', 'see pp. B82-83', 'Expansion (Basic Set advantage)'),
('fantasy', 131, 'See Invisible', 'see p. B83', 'Expansion (Basic Set advantage)'),
('fantasy', 131, 'Shadow Form', 'see p. B83', 'Expansion (Basic Set advantage)'),
('fantasy', 131, 'Shapeshifting', 'see pp. B83-85', 'Expansion (Basic Set advantage)'),
('fantasy', 131, 'Signature Gear', 'see p. B85', 'Expansion (Basic Set advantage)'),
('fantasy', 132, 'Single-Minded', 'see p. B85', 'Expansion (Basic Set advantage)'),
('fantasy', 132, 'Talent', 'see pp. B89-91', 'Expansion (Basic Set advantage)'),
('fantasy', 132, 'Allure', '5 points/level', 'Talent'),
('fantasy', 132, 'Bard', '5 points/level', 'Talent'),
('fantasy', 132, 'Devotion', '5 points/level', 'Talent'),
('fantasy', 132, 'Goodwife', '5 points/level', 'Talent'),
('fantasy', 132, 'Mariner', '10 points/level', 'Talent'),
('fantasy', 132, 'Master Builder', '5 points/level', 'Talent'),
('fantasy', 132, 'Sage', '10 points/level', 'Talent'),
('fantasy', 132, 'Named Possession', '1 point', 'Perk'),
('fantasy', 132, 'Weapon Bond', '1 point', 'Perk'),
('fantasy', 219, 'Eidetic Memory', 'see p. B51', 'Expansion (Basic Set advantage)'),
('gladiators', 17, 'Patron', 'see p. B72', 'Expansion (Basic Set advantage)'),
('gladiators', 18, 'Gladiator Rank', 'see p. B29', 'Expansion (Basic Set advantage)'),
('gladiators', 18, 'Style Familiarity', 'see Martial Arts, p. 49', 'Expansion (Basic Set advantage)'),
('gladiators', 18, 'Style Perks', 'see Martial Arts, pp. 49-52', 'Expansion (Basic Set advantage)'),
('gladiators', 18, 'Exotic Weapon Training', '1 point', 'Perk'),
('gladiators', 18, 'Extra Option', '1 point', 'Perk'),
('gladiators', 18, 'Naval Training', '1 point', 'Perk'),
('gladiators', 18, 'Off-Hand Weapon Training', '1 point', 'Perk'),
('gladiators', 18, 'Shoves and Tackles', '1 point', 'Perk'),
('gladiators', 18, 'Sure-Footed', '1 point', 'Perk'),
('lowtech', 8, 'Language', 'see pp. B23-25', 'Expansion (Basic Set advantage)'),
('lowtech', 8, 'Wealth and Status', 'see pp. B25-29', 'Expansion (Basic Set advantage)'),
('lowtech', 9, 'Anachronistic Skill', '1 point', 'Perk'),
('lowtech', 9, 'Chariot Training', '1 point', 'Perk'),
('lowtech', 9, 'Equipment Bond', '1 point', 'Perk'),
('lowtech', 9, 'Improvised Weapons', '1 point', 'Perk'),
('lowtech', 9, 'Naval Training', '1 point', 'Perk'),
('lowtech', 9, 'Two-Man Pike Training', '1 point', 'Perk'),
]


def norm(s):
    s = unicodedata.normalize("NFKC", s).replace("’", "'").replace("‘", "'")
    return re.sub(r"[^a-z0-9]", "", s.lower())


def fonte(w):
    return w["fontname"].split("+")[-1]


def eh_titulo(w):
    f = fonte(w)
    return ("SemiBold" in f or "Black" in f) and w["size"] >= 10.5


def colunas(words, largura):
    """Descobre as margens esquerdas das colunas pelos inícios de linha."""
    inicios = Counter()
    linhas = {}
    for w in words:
        linhas.setdefault(round(w["top"] / 2), []).append(w)
    for ws in linhas.values():
        ws.sort(key=lambda w: w["x0"])
        anterior = None
        for w in ws:
            if anterior is None or w["x0"] - anterior["x1"] > 15:
                inicios[round(w["x0"] / 6) * 6] += 1
            anterior = w
    picos = sorted(x for x, c in inicios.items() if c >= 6)
    cols = []
    for x in picos:
        if not cols or x - cols[-1] > largura * 0.2:
            cols.append(x)
    return cols or [0]


def linhas_da_pagina(page):
    h = page.height
    words = [w for w in page.extract_words(x_tolerance=1.5, extra_attrs=["fontname", "size"])
             if 30 < w["top"] < h - 45 and "ICONS" not in w["fontname"].upper()]
    cols = colunas(words, page.width)
    grupos = {}
    for w in words:
        c = max([i for i, x in enumerate(cols) if x <= w["x0"] + 4] or [0])
        grupos.setdefault(c, []).append(w)
    saida = []
    for c in sorted(grupos):
        ws = sorted(grupos[c], key=lambda w: (round(w["top"] / 3), w["x0"]))
        atual = []
        for w in ws:
            if atual and abs(atual[-1]["top"] - w["top"]) >= 3:
                saida.append(atual)
                atual = []
            atual.append(w)
        if atual:
            saida.append(atual)
    return saida


def juntar(partes):
    texto = ""
    for p in partes:
        p = p.strip()
        if not p:
            continue
        if texto.endswith("-") and p[:1].islower():
            texto = texto[:-1] + p
        else:
            texto = f"{texto} {p}" if texto else p
    # a fonte dos livros desenha o "×" com o código do "¥"
    return re.sub(r"\s+", " ", texto).strip().replace("¥", "×")


class Livro:
    def __init__(self, caminho, deslocamento):
        self.pdf = pdfplumber.open(caminho)
        self.desl = deslocamento
        self.cache = {}

    def linhas(self, pagina_impressa):
        i = pagina_impressa + self.desl - 1
        if i < 0 or i >= len(self.pdf.pages):
            return []
        if i not in self.cache:
            p = self.pdf.pages[i]
            self.cache[i] = linhas_da_pagina(p)
            p.flush_cache()
            if len(self.cache) > 8:
                self.cache.pop(next(iter(self.cache)))
            gc.collect()
        return self.cache[i]


CUSTO = re.compile(r"^(see|variable|\d)", re.I)


def texto_titulo(ln):
    return " ".join(w["text"] for w in ln if eh_titulo(w))


def corpo(seq, i, alvo, nomes_do_livro, inline=False):
    partes = []  # lista de linhas (listas de palavras)
    for prox in seq[i:]:
        t = " ".join(w["text"] for w in prox)
        tt = norm(t) if inline else norm(texto_titulo(prox))
        if partes:
            if inline:
                fim = any(tt.startswith(n) and n != alvo and ":" in t[:40] for n in nomes_do_livro) \
                      or (eh_titulo(prox[0]) and ("Italic" in fonte(prox[0]) or "Black" in fonte(prox[0])))
            else:
                p0 = prox[0]
                fim = eh_titulo(p0) and (("Italic" in fonte(p0) and p0["size"] >= 13) or "Black" in fonte(p0)
                                         or any(tt.startswith(n) and n != alvo for n in nomes_do_livro))
            if fim and (inline or tt):
                break
        partes.append(prox)
        if sum(len(p) for p in partes) > 20000:
            break
    return partes


def extrair(livro, pagina, nome, nomes_do_livro):
    alvo = norm(nome)
    for pg_inicio in (pagina, pagina - 1, pagina + 1):
        seq = []
        for pg in range(pg_inicio, pg_inicio + 5):
            seq += livro.linhas(pg)
        # 1) cabeçalho em negrito (pode ocupar duas linhas)
        for i, ln in enumerate(seq):
            t1 = norm(texto_titulo(ln))
            if not t1:
                continue
            t2 = t1 + (norm(texto_titulo(seq[i + 1])) if i + 1 < len(seq) else "")
            if t1.startswith(alvo):
                inicio = i
            elif t2.startswith(alvo) and alvo.startswith(t1):
                inicio = i + 1
            else:
                continue
            linhas = corpo(seq, inicio, alvo, nomes_do_livro)
            textos, custo_txt = [], ""
            for k, l in enumerate(linhas):
                normais = [w["text"] for w in l if not eh_titulo(w)]
                tit = texto_titulo(l)
                if k == 0:
                    textos.append(" ".join(normais))
                    continue
                if tit and not norm(tit):
                    continue  # ícones soltos como "/"
                if not custo_txt and k <= 3 and eh_titulo(l[0]) and CUSTO.match(tit):
                    custo_txt = tit
                    textos.append(" ".join(normais))
                    continue
                textos.append(" ".join(w["text"] for w in l))
            texto = juntar(textos) or custo_txt
            if texto:
                return texto
        # 2) entrada dentro do texto, no formato "Nome: descrição"
        for i, ln in enumerate(seq):
            t = " ".join(w["text"] for w in ln)
            m = re.match(r"^(.{1,60}?)\s*\d*\s*:", t)
            if m and norm(m.group(1)) == alvo:
                linhas = corpo(seq, i, alvo, nomes_do_livro, inline=True)
                textos = [t[m.end():]] + [" ".join(w["text"] for w in l) for l in linhas[1:]]
                texto = juntar(textos)
                if texto:
                    return texto
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pasta", type=Path, default=PASTA_PADRAO)
    ap.add_argument("--saida", type=Path, default=None)
    a = ap.parse_args()
    if not a.pasta.is_dir():
        sys.exit(f"Pasta não encontrada: {a.pasta}")
    pdfs = list(a.pasta.rglob("*.pdf"))
    abertos = {}
    for chave, (titulo, reconhece, desl) in LIVROS.items():
        achados = [p for p in pdfs if reconhece(p.name.lower().replace("_", " ").replace(" - ", " "))]
        if achados:
            abertos[chave] = Livro(achados[0], desl)
            print(f"{titulo}: {achados[0].name}")
        else:
            print(f"{titulo}: PDF não encontrado, descrições ficarão vazias")
    nomes = {}
    for chave, _, nome, _, _ in DADOS:
        nomes.setdefault(chave, set()).add(norm(nome))
    saida = a.saida or (a.pasta / "advantages.csv")
    falhas = []
    with open(saida, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["livro", "pagina", "advantage", "custo", "tipo", "descricao"])
        for n, (chave, pag, nome, custo, tipo) in enumerate(DADOS, 1):
            texto = extrair(abertos[chave], pag, nome, nomes[chave]) if chave in abertos else ""
            if not texto:
                falhas.append(f"{LIVROS[chave][0]} p.{pag} {nome}")
            w.writerow([LIVROS[chave][0], pag, nome, custo, tipo, texto])
            if n % 25 == 0:
                print(f"  {n}/{len(DADOS)}...")
    print(f"\nPronto: {len(DADOS)} vantagens -> {saida}")
    if falhas:
        print("Sem descrição (confira manualmente):")
        for x in falhas:
            print("  -", x)


if __name__ == "__main__":
    main()

// Top medications in Mexico — Cuadro Básico de Medicamentos + common brand names

export interface MedicationEntry {
  name: string
  brandName?: string
  presentation: string
  concentration: string
  route: string
  category: string
}

export const MEDICATIONS_MX: MedicationEntry[] = [
  // Analgesics / NSAIDs
  { name: 'Paracetamol', brandName: 'Tempra / Tylenol', presentation: 'tabletas', concentration: '500mg', route: 'oral', category: 'Analgésico' },
  { name: 'Ibuprofeno', brandName: 'Advil / Motrin', presentation: 'tabletas', concentration: '400mg', route: 'oral', category: 'AINE' },
  { name: 'Naproxeno', brandName: 'Naprosyn', presentation: 'tabletas', concentration: '250mg', route: 'oral', category: 'AINE' },
  { name: 'Diclofenaco', brandName: 'Cataflam / Voltaren', presentation: 'tabletas', concentration: '50mg', route: 'oral', category: 'AINE' },
  { name: 'Ketorolaco', brandName: 'Toradol', presentation: 'tabletas', concentration: '10mg', route: 'oral', category: 'AINE' },
  { name: 'Metamizol', brandName: 'Nolotil / Novalgina', presentation: 'tabletas', concentration: '500mg', route: 'oral', category: 'Analgésico' },
  { name: 'Tramadol', presentation: 'cápsulas', concentration: '50mg', route: 'oral', category: 'Opioide' },
  { name: 'Morfina', presentation: 'solución inyectable', concentration: '10mg/mL', route: 'IM/IV', category: 'Opioide' },
  // Antibiotics
  { name: 'Amoxicilina', brandName: 'Amoxil', presentation: 'cápsulas', concentration: '500mg', route: 'oral', category: 'Antibiótico' },
  { name: 'Amoxicilina + Ácido clavulánico', brandName: 'Augmentin', presentation: 'tabletas', concentration: '875mg/125mg', route: 'oral', category: 'Antibiótico' },
  { name: 'Azitromicina', brandName: 'Zithromax', presentation: 'tabletas', concentration: '500mg', route: 'oral', category: 'Antibiótico' },
  { name: 'Ciprofloxacino', brandName: 'Cipro', presentation: 'tabletas', concentration: '500mg', route: 'oral', category: 'Antibiótico' },
  { name: 'Metronidazol', brandName: 'Flagyl', presentation: 'tabletas', concentration: '500mg', route: 'oral', category: 'Antibiótico' },
  { name: 'Clindamicina', presentation: 'cápsulas', concentration: '300mg', route: 'oral', category: 'Antibiótico' },
  { name: 'Doxiciclina', presentation: 'cápsulas', concentration: '100mg', route: 'oral', category: 'Antibiótico' },
  { name: 'Cefalexina', presentation: 'cápsulas', concentration: '500mg', route: 'oral', category: 'Antibiótico' },
  { name: 'Ceftriaxona', presentation: 'solución inyectable', concentration: '1g', route: 'IM/IV', category: 'Antibiótico' },
  { name: 'Nitrofurantoína', presentation: 'cápsulas', concentration: '100mg', route: 'oral', category: 'Antibiótico' },
  { name: 'Trimetoprima + Sulfametoxazol', brandName: 'Bactrim', presentation: 'tabletas', concentration: '160mg/800mg', route: 'oral', category: 'Antibiótico' },
  { name: 'Vancomicina', presentation: 'solución inyectable', concentration: '500mg', route: 'IV', category: 'Antibiótico' },
  // Antifungals
  { name: 'Fluconazol', brandName: 'Diflucan', presentation: 'cápsulas', concentration: '150mg', route: 'oral', category: 'Antifúngico' },
  { name: 'Clotrimazol', presentation: 'óvulos vaginales', concentration: '500mg', route: 'vaginal', category: 'Antifúngico' },
  // Gynecology / Hormonal
  { name: 'Levonorgestrel + Etinilestradiol', brandName: 'Microgynon / Loette', presentation: 'tabletas', concentration: '150/30 mcg', route: 'oral', category: 'Anticonceptivo' },
  { name: 'Progesterona', presentation: 'cápsulas blandas', concentration: '200mg', route: 'oral/vaginal', category: 'Hormonal' },
  { name: 'Levonorgestrel', brandName: 'Plan B / Postinor', presentation: 'tabletas', concentration: '1.5mg', route: 'oral', category: 'Anticonceptivo de emergencia' },
  { name: 'Medroxiprogesterona', brandName: 'Depo-Provera', presentation: 'suspensión inyectable', concentration: '150mg/mL', route: 'IM', category: 'Anticonceptivo' },
  { name: 'Acido fólico', presentation: 'tabletas', concentration: '5mg', route: 'oral', category: 'Vitamina' },
  { name: 'Sulfato ferroso', presentation: 'tabletas', concentration: '325mg', route: 'oral', category: 'Suplemento' },
  // Gastrointestinal
  { name: 'Omeprazol', brandName: 'Prilosec', presentation: 'cápsulas', concentration: '20mg', route: 'oral', category: 'Gastroprotector' },
  { name: 'Pantoprazol', brandName: 'Protonix', presentation: 'tabletas', concentration: '40mg', route: 'oral', category: 'Gastroprotector' },
  { name: 'Ranitidina', presentation: 'tabletas', concentration: '150mg', route: 'oral', category: 'Antiácido' },
  { name: 'Metoclopramida', brandName: 'Plasil', presentation: 'tabletas', concentration: '10mg', route: 'oral', category: 'Procinético' },
  { name: 'Ondansetrón', brandName: 'Zofran', presentation: 'tabletas', concentration: '8mg', route: 'oral', category: 'Antiemético' },
  { name: 'Loperamida', brandName: 'Imodium', presentation: 'cápsulas', concentration: '2mg', route: 'oral', category: 'Antidiarreico' },
  { name: 'Sucralfato', presentation: 'tabletas', concentration: '1g', route: 'oral', category: 'Gastroprotector' },
  { name: 'Bismuto subsalicilato', brandName: 'Pepto-Bismol', presentation: 'tabletas masticables', concentration: '262mg', route: 'oral', category: 'Antidiarreico' },
  // Cardiovascular / Antihypertensive
  { name: 'Enalapril', brandName: 'Vasotec', presentation: 'tabletas', concentration: '10mg', route: 'oral', category: 'IECA' },
  { name: 'Losartán', brandName: 'Cozaar', presentation: 'tabletas', concentration: '50mg', route: 'oral', category: 'ARA-II' },
  { name: 'Amlodipino', brandName: 'Norvasc', presentation: 'tabletas', concentration: '5mg', route: 'oral', category: 'Calcioantagonista' },
  { name: 'Metoprolol', brandName: 'Lopressor', presentation: 'tabletas', concentration: '50mg', route: 'oral', category: 'Betabloqueador' },
  { name: 'Atenolol', presentation: 'tabletas', concentration: '50mg', route: 'oral', category: 'Betabloqueador' },
  { name: 'Hidroclorotiazida', presentation: 'tabletas', concentration: '25mg', route: 'oral', category: 'Diurético' },
  { name: 'Furosemida', brandName: 'Lasix', presentation: 'tabletas', concentration: '40mg', route: 'oral', category: 'Diurético' },
  { name: 'Espironolactona', presentation: 'tabletas', concentration: '25mg', route: 'oral', category: 'Diurético' },
  { name: 'Nifedipino', brandName: 'Adalat', presentation: 'cápsulas de liberación prolongada', concentration: '30mg', route: 'oral', category: 'Calcioantagonista' },
  { name: 'Captopril', presentation: 'tabletas', concentration: '25mg', route: 'oral', category: 'IECA' },
  // Lipid-lowering
  { name: 'Atorvastatina', brandName: 'Lipitor', presentation: 'tabletas', concentration: '20mg', route: 'oral', category: 'Estatina' },
  { name: 'Simvastatina', brandName: 'Zocor', presentation: 'tabletas', concentration: '20mg', route: 'oral', category: 'Estatina' },
  { name: 'Rosuvastatina', brandName: 'Crestor', presentation: 'tabletas', concentration: '10mg', route: 'oral', category: 'Estatina' },
  // Antidiabetics
  { name: 'Metformina', brandName: 'Glucophage', presentation: 'tabletas', concentration: '850mg', route: 'oral', category: 'Antidiabético' },
  { name: 'Glibenclamida', presentation: 'tabletas', concentration: '5mg', route: 'oral', category: 'Antidiabético' },
  { name: 'Sitagliptina', brandName: 'Januvia', presentation: 'tabletas', concentration: '100mg', route: 'oral', category: 'Antidiabético' },
  { name: 'Empagliflozina', brandName: 'Jardiance', presentation: 'tabletas', concentration: '10mg', route: 'oral', category: 'Antidiabético' },
  { name: 'Insulina NPH', presentation: 'solución inyectable', concentration: '100 UI/mL', route: 'SC', category: 'Insulina' },
  { name: 'Insulina glargina', brandName: 'Lantus', presentation: 'solución inyectable', concentration: '100 UI/mL', route: 'SC', category: 'Insulina' },
  // Thyroid
  { name: 'Levotiroxina', brandName: 'Synthroid', presentation: 'tabletas', concentration: '100 mcg', route: 'oral', category: 'Hormona tiroidea' },
  // Respiratory
  { name: 'Salbutamol', brandName: 'Ventolin', presentation: 'inhalador', concentration: '100 mcg/dosis', route: 'inhalado', category: 'Broncodilatador' },
  { name: 'Budesonida', brandName: 'Pulmicort', presentation: 'inhalador', concentration: '200 mcg/dosis', route: 'inhalado', category: 'Corticoide inhalado' },
  { name: 'Montelukast', brandName: 'Singulair', presentation: 'tabletas', concentration: '10mg', route: 'oral', category: 'Antiasmático' },
  { name: 'Loratadina', brandName: 'Claritin', presentation: 'tabletas', concentration: '10mg', route: 'oral', category: 'Antihistamínico' },
  { name: 'Cetirizina', brandName: 'Zyrtec', presentation: 'tabletas', concentration: '10mg', route: 'oral', category: 'Antihistamínico' },
  { name: 'Dexametasona', presentation: 'tabletas', concentration: '0.5mg', route: 'oral', category: 'Corticoide' },
  { name: 'Prednisona', presentation: 'tabletas', concentration: '5mg', route: 'oral', category: 'Corticoide' },
  { name: 'Prednisolona', presentation: 'tabletas', concentration: '5mg', route: 'oral', category: 'Corticoide' },
  // Neurological / Psychiatric
  { name: 'Sertralina', brandName: 'Zoloft', presentation: 'tabletas', concentration: '50mg', route: 'oral', category: 'Antidepresivo ISRS' },
  { name: 'Escitalopram', brandName: 'Lexapro', presentation: 'tabletas', concentration: '10mg', route: 'oral', category: 'Antidepresivo ISRS' },
  { name: 'Fluoxetina', brandName: 'Prozac', presentation: 'cápsulas', concentration: '20mg', route: 'oral', category: 'Antidepresivo ISRS' },
  { name: 'Alprazolam', brandName: 'Xanax', presentation: 'tabletas', concentration: '0.5mg', route: 'oral', category: 'Ansiolítico' },
  { name: 'Clonazepam', brandName: 'Rivotril', presentation: 'tabletas', concentration: '0.5mg', route: 'oral', category: 'Ansiolítico' },
  { name: 'Amitriptilina', presentation: 'tabletas', concentration: '25mg', route: 'oral', category: 'Antidepresivo tricíclico' },
  { name: 'Carbamazepina', brandName: 'Tegretol', presentation: 'tabletas', concentration: '200mg', route: 'oral', category: 'Anticonvulsivo' },
  { name: 'Ácido valproico', brandName: 'Depakote', presentation: 'tabletas de liberación prolongada', concentration: '500mg', route: 'oral', category: 'Anticonvulsivo' },
  { name: 'Sumatriptán', brandName: 'Imitrex', presentation: 'tabletas', concentration: '50mg', route: 'oral', category: 'Antimigranoso' },
  // Topical
  { name: 'Hidrocortisona', presentation: 'crema', concentration: '1%', route: 'tópico', category: 'Corticoide tópico' },
  { name: 'Betametasona', presentation: 'crema', concentration: '0.05%', route: 'tópico', category: 'Corticoide tópico' },
  { name: 'Mupirocina', brandName: 'Bactroban', presentation: 'ungüento', concentration: '2%', route: 'tópico', category: 'Antibiótico tópico' },
  { name: 'Tretinoína', presentation: 'crema', concentration: '0.025%', route: 'tópico', category: 'Retinoide tópico' },
  // Antiparasitics
  { name: 'Albendazol', brandName: 'Zentel', presentation: 'tabletas', concentration: '400mg', route: 'oral', category: 'Antiparasitario' },
  { name: 'Ivermectina', brandName: 'Stromectol', presentation: 'tabletas', concentration: '6mg', route: 'oral', category: 'Antiparasitario' },
  // Vitamins / Supplements
  { name: 'Vitamina D3', presentation: 'cápsulas', concentration: '1000 UI', route: 'oral', category: 'Vitamina' },
  { name: 'Vitamina C', presentation: 'tabletas', concentration: '500mg', route: 'oral', category: 'Vitamina' },
  { name: 'Calcio + Vitamina D', presentation: 'tabletas', concentration: '600mg/400 UI', route: 'oral', category: 'Suplemento' },
  { name: 'Complejo B', presentation: 'tabletas', concentration: 'Variable', route: 'oral', category: 'Vitamina' },
  { name: 'Hierro polimaltosado', presentation: 'jarabe', concentration: '150mg/15mL', route: 'oral', category: 'Suplemento' },
  { name: 'Zinc', presentation: 'tabletas', concentration: '20mg', route: 'oral', category: 'Suplemento' },
  // Urology
  { name: 'Tamsulosina', brandName: 'Flomax', presentation: 'cápsulas de liberación prolongada', concentration: '0.4mg', route: 'oral', category: 'Alfa bloqueador' },
  { name: 'Solifenacina', brandName: 'Vesicare', presentation: 'tabletas', concentration: '5mg', route: 'oral', category: 'Antimuscarínico' },
  // Musculoskeletal
  { name: 'Ciclobenzaprina', presentation: 'tabletas', concentration: '5mg', route: 'oral', category: 'Relajante muscular' },
  { name: 'Carisoprodol', brandName: 'Soma', presentation: 'tabletas', concentration: '350mg', route: 'oral', category: 'Relajante muscular' },
  { name: 'Meloxicam', presentation: 'tabletas', concentration: '15mg', route: 'oral', category: 'AINE' },
  { name: 'Celecoxib', brandName: 'Celebrex', presentation: 'cápsulas', concentration: '200mg', route: 'oral', category: 'AINE COX-2' },
  // Other
  { name: 'Ácido acetilsalicílico', brandName: 'Aspirina', presentation: 'tabletas', concentration: '100mg', route: 'oral', category: 'Antiagregante' },
  { name: 'Clopidogrel', brandName: 'Plavix', presentation: 'tabletas', concentration: '75mg', route: 'oral', category: 'Antiagregante' },
  { name: 'Warfarina', presentation: 'tabletas', concentration: '5mg', route: 'oral', category: 'Anticoagulante' },
  { name: 'Rivaroxabán', brandName: 'Xarelto', presentation: 'tabletas', concentration: '20mg', route: 'oral', category: 'Anticoagulante' },
]

export function searchMedications(query: string): MedicationEntry[] {
  const q = query.toLowerCase()
  return MEDICATIONS_MX.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.brandName?.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q)
  ).slice(0, 15)
}

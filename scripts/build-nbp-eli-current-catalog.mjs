#!/usr/bin/env node

import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = resolve(ROOT, "data/recognition/nbp-eli-current-catalog-v1.json");
const PLAN_URLS = {
  2023: "https://static.nbp.pl/publikacje/numizmatyka/plan-2023-pl.pdf",
  2024: "https://static.nbp.pl/publikacje/numizmatyka/plan-2024-pl.pdf",
  2025: "https://static.nbp.pl/publikacje/numizmatyka/plan-2025-pl.pdf",
};
const RETRIEVED_AT = "2026-08-29";
const args = new Set(process.argv.slice(2));

const ISSUE_GROUPS_2023 = [
  {
    act: "MP/2023/6",
    topic: "160. rocznica Powstania Styczniowego",
    issueDate: "2023-01-16",
    coins: [
      { nominal: 20, metal: "Srebro Ag 925", weightGrams: 28.28, diameterMm: 38.61, mintage: 10000, technique: "stempel lustrzany; druk cyfrowy" },
      { nominal: 200, metal: "Złoto Au 900", weightGrams: 15.5, diameterMm: 27, mintage: 1200, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2023/12",
    topic: "Skarby Stanisława Augusta – Stanisław Leszczyński",
    issueDate: "2023-01-26",
    coins: [
      { nominal: 50, metal: "Srebro Ag 999", weightGrams: 62.2, diameterMm: 45, mintage: 6000, technique: "stempel zwykły" },
      { nominal: 500, metal: "Złoto Au 999,9", weightGrams: 62.2, diameterMm: 45, mintage: 600, technique: "stempel zwykły" },
    ],
  },
  {
    act: "MP/2023/140",
    topic: "Mikołaj Kopernik",
    issueDate: "2023-02-09",
    coins: [
      { nominal: 50, metal: "Srebro Ag 999", weightGrams: 62.2, diameterMm: 45, mintage: 7000, technique: "stempel zwykły; wysoki relief; bursztyn" },
    ],
  },
  {
    act: "MP/2023/224",
    topic: "Wyklęci przez komunistów żołnierze niezłomni – Józef Kuraś „Ogień”",
    issueDate: "2023-03-15",
    coins: [
      { nominal: 10, metal: "Srebro Ag 925", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany; tampondruk" },
    ],
  },
  {
    act: "MP/2023/269",
    topic: "Stanisław Wojciechowski",
    issueDate: "2023-04-04",
    coins: [
      { nominal: 10, metal: "Srebro Ag 925", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2023/299",
    topic: "80. rocznica wybuchu powstania w getcie warszawskim",
    issueDate: "2023-04-12",
    coins: [
      { nominal: 10, metal: "Srebro Ag 925", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany" },
      { nominal: 200, metal: "Złoto Au 900", weightGrams: 15.5, diameterMm: 27, mintage: 1200, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2023/467",
    topic: "W Polskę wierzę – Polska rodzina",
    issueDate: "2023-05-10",
    coins: [
      { nominal: 10, metal: "Srebro Ag 925", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany; druk UV" },
    ],
  },
  {
    act: "MP/2023/488",
    topic: "Odkryj Polskę – Kanał Żeglugowy przez Mierzeję Wiślaną",
    issueDate: "2023-05-22",
    coins: [
      { nominal: 5, metal: "Pierścień MN25, rdzeń CuAl6Ni2", weightGrams: 6.54, diameterMm: 24, mintage: 1000000, technique: "standard obiegowy" },
    ],
  },
  {
    act: "MP/2023/536",
    topic: "Polskie banknoty obiegowe – Banknot o nominale 10 zł",
    issueDate: "2023-06-20",
    coins: [
      { nominal: 10, metal: "Złoto Au 999,9", weightGrams: 31.1, dimensionsMm: [50, 25], mintage: 1500, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2023/616",
    topic: "Wyklęci przez komunistów żołnierze niezłomni – Stanisław Sojczyński „Warszyc”",
    issueDate: "2023-07-18",
    coins: [
      { nominal: 10, metal: "Srebro Ag 925", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany; tampondruk" },
    ],
  },
  {
    act: "MP/2023/699",
    topic: "600-lecie nadania Łodzi praw miejskich",
    issueDate: "2023-07-25",
    coins: [
      { nominal: 10, metal: "Srebro Ag 925", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2023/737",
    topic: "Polskie Termopile – Warszawskie Termopile",
    issueDate: "2023-08-17",
    coins: [
      { nominal: 20, metal: "Srebro Ag 925", weightGrams: 28.28, diameterMm: 38.61, mintage: 10000, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2023/832",
    topic: "Przyjaźń i braterstwo to największe bogactwo",
    issueDate: "2023-08-24",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 31.1, dimensionsMm: [26.42, 50], mintage: 10000, technique: "stempel lustrzany; tampondruk; wspólny polsko-ukraiński zestaw" },
    ],
  },
  {
    act: "MP/2023/866",
    topic: "Sowiecka agresja na Polskę – 17 IX 1939 r.",
    issueDate: "2023-09-05",
    coins: [
      { nominal: 20, metal: "Srebro Ag 925", weightGrams: 28.28, diameterMm: 38.61, mintage: 12000, technique: "stempel zwykły; oksydowanie" },
    ],
  },
  {
    act: "MP/2023/887",
    topic: "30. rocznica wycofania wojsk sowieckich z Polski",
    issueDate: "2023-09-14",
    coins: [
      { nominal: 10, metal: "Srebro Ag 925", weightGrams: 14.14, diameterMm: 32, mintage: 12000, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2023/998",
    topic: "Marsz Niepodległości",
    issueDate: "2023-09-26",
    coins: [
      { nominal: 10, metal: "Srebro Ag 925", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany; druk UV" },
    ],
  },
  {
    act: "MP/2023/1040",
    topic: "500. rocznica urodzin Anny Jagiellonki",
    issueDate: "2023-10-03",
    coins: [
      { nominal: 50, metal: "Srebro Ag 999", weightGrams: 62.2, diameterMm: 45, mintage: 7000, technique: "stempel zwykły; wysoki relief" },
    ],
  },
  {
    act: "MP/2023/1042",
    topic: "Odsiecz wiedeńska",
    issueDate: "2023-10-10",
    coins: [
      { nominal: 50, metal: "Srebro Ag 999", weightGrams: 62.2, dimensionsMm: [32, 50], mintage: 6000, technique: "stempel zwykły; wysoki relief" },
      { nominal: 100, metal: "Złoto Au 900", weightGrams: 8, diameterMm: 21, mintage: 1200, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2023/1059",
    topic: "250. rocznica powołania Komisji Edukacji Narodowej",
    issueDate: "2023-10-12",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 31.1, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany; wysoki relief" },
    ],
  },
  {
    act: "MP/2023/1134",
    topic: "Odkryj Polskę – Gościkowo-Paradyż – pocysterski zespół klasztorny",
    issueDate: "2023-11-08",
    coins: [
      { nominal: 5, metal: "Pierścień MN25, rdzeń CuAl6Ni2", weightGrams: 6.54, diameterMm: 24, mintage: 1000000, technique: "standard obiegowy" },
    ],
  },
  {
    act: "MP/2023/1238",
    topic: "Skarby Stanisława Augusta – August III Sas",
    issueDate: "2023-12-05",
    coins: [
      { nominal: 50, metal: "Srebro Ag 999", weightGrams: 62.2, diameterMm: 45, mintage: 6000, technique: "stempel zwykły" },
      { nominal: 500, metal: "Złoto Au 999,9", weightGrams: 62.2, diameterMm: 45, mintage: 600, technique: "stempel zwykły" },
    ],
  },
];

const ISSUE_GROUPS_2024 = [
  {
    act: "MP/2023/1458",
    topic: "Polskie banknoty obiegowe – Banknot o nominale 20 zł",
    issueDate: "2024-01-23",
    coins: [
      { nominal: 20, metal: "Złoto Au 999,9", weightGrams: 31.1, dimensionsMm: [50, 25], mintage: 1500, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2024/81",
    topic: "Mjr Henryk Dobrzański „Hubal”",
    issueDate: "2024-02-13",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 31.1, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany; wysoki relief" },
    ],
  },
  {
    act: "MP/2024/96",
    topic: "Pamięci Rodziny Ulmów",
    issueDate: "2024-02-22",
    coins: [
      { nominal: 50, metal: "Srebro Ag 999", weightGrams: 62.2, diameterMm: 45, mintage: 5000, technique: "stempel zwykły; oksydowanie; bursztyn" },
    ],
  },
  {
    act: "MP/2024/100",
    topic: "Wyklęci przez komunistów żołnierze niezłomni – Zygmunt Szendzielarz Łupaszka",
    issueDate: "2024-02-27",
    coins: [
      { nominal: 10, metal: "Srebro Ag 925", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany; tampondruk" },
    ],
  },
  {
    act: "MP/2024/171",
    topic: "25. rocznica wstąpienia Polski do NATO",
    issueDate: "2024-03-07",
    coins: [
      { nominal: 10, metal: "Srebro Ag 925", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2024/236",
    topic: "100. rocznica utworzenia Banku Polskiego SA",
    issueDate: "2024-04-11",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 31.1, diameterMm: 32, mintage: 11000, technique: "stempel lustrzany; wysoki relief" },
    ],
  },
  {
    act: "MP/2024/289",
    topic: "100. rocznica wprowadzenia złotego do obiegu",
    issueDate: "2024-04-25",
    coins: [
      { nominal: 1, metal: "Srebro Ag 999", weightGrams: 28.28, dimensionsMm: [40, 40], shape: "square", mintage: 10000, technique: "stempel lustrzany; selektywne złocenie" },
    ],
  },
  {
    act: "MP/2024/332",
    topic: "230. rocznica insurekcji kościuszkowskiej",
    issueDate: "2024-05-14",
    coins: [
      { nominal: 50, metal: "Srebro Ag 999", weightGrams: 62.2, dimensionsMm: [32, 50], mintage: 6000, technique: "stempel lustrzany" },
      { nominal: 100, metal: "Złoto Au 900", weightGrams: 8, diameterMm: 21, mintage: 1200, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2024/333",
    topic: "Odkryj Polskę – Opactwo Benedyktynów w Tyńcu",
    issueDate: "2024-05-22",
    coins: [
      { nominal: 5, metal: "Pierścień MN25, rdzeń CuAl6Ni2", weightGrams: 6.54, diameterMm: 24, mintage: 1000000, technique: "standard obiegowy" },
    ],
  },
  {
    act: "MP/2024/349",
    topic: "W Polskę wierzę – Polska wolna i suwerenna",
    issueDate: "2024-05-28",
    coins: [
      { nominal: 10, metal: "Srebro Ag 925", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany; druk UV" },
    ],
  },
  {
    act: "MP/2024/410",
    topic: "Słowacka mniejszość narodowa w Polsce",
    issueDate: "2024-06-12",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2024/464",
    topic: "80. rocznica operacji Armii Krajowej „Ostra Brama”",
    issueDate: "2024-06-25",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2024/607",
    topic: "160. rocznica śmierci Romualda Traugutta",
    issueDate: "2024-07-23",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 31.1, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany" },
      { nominal: 200, metal: "Złoto Au 900", weightGrams: 15.5, diameterMm: 27, mintage: 1200, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2024/674",
    topic: "Historia monety polskiej – Grosz z miedzi krajowej Stanisława Augusta",
    issueDate: "2024-08-07",
    coins: [
      { nominal: 20, metal: "Srebro Ag 925", weightGrams: 28.28, diameterMm: 38.61, mintage: 10000, technique: "stempel lustrzany; selektywne platerowanie" },
    ],
  },
  {
    act: "MP/2024/725",
    topic: "Pamięci więźniów warszawskiego Pawiaka",
    issueDate: "2024-08-21",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany; selektywne złocenie" },
    ],
  },
  {
    act: "MP/2024/726",
    topic: "Ofiarom obozu koncentracyjnego Stutthof",
    issueDate: "2024-08-27",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2024/793",
    topic: "100-lecie utworzenia Korpusu Ochrony Pogranicza",
    issueDate: "2024-09-10",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany; druk UV" },
    ],
  },
  {
    act: "MP/2024/861",
    topic: "Polskie Termopile – Głogów",
    issueDate: "2024-10-17",
    coins: [
      { nominal: 20, metal: "Srebro Ag 925", weightGrams: 28.28, diameterMm: 38.61, mintage: 10000, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2024/868",
    topic: "Odkryj Polskę – Zamek w Łańcucie",
    issueDate: "2024-11-07",
    coins: [
      { nominal: 5, metal: "Pierścień MN25, rdzeń CuAl6Ni2", weightGrams: 6.54, diameterMm: 24, mintage: 1000000, technique: "standard obiegowy" },
    ],
  },
  {
    act: "MP/2024/898",
    topic: "Wyklęci przez komunistów żołnierze niezłomni – Henryk Flame Bartek",
    issueDate: "2024-11-14",
    coins: [
      { nominal: 10, metal: "Srebro Ag 925", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany; tampondruk" },
    ],
  },
  {
    act: "MP/2024/903",
    topic: "Wyklęci przez komunistów żołnierze niezłomni – Władysław Gurgacz Sem",
    issueDate: "2024-11-14",
    coins: [
      { nominal: 10, metal: "Srebro Ag 925", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany; tampondruk" },
    ],
  },
];

const ISSUE_GROUPS_2025 = [
  {
    act: "MP/2024/1073",
    topic: "Skarby sztuki medalierskiej – Stanisław Małachowski",
    issueDate: "2025-01-16",
    coins: [
      { nominal: 50, metal: "Srebro Ag 999", weightGrams: 62.2, diameterMm: 45, mintage: 5000, technique: "wysoki relief" },
    ],
  },
  {
    act: "MP/2025/82",
    topic: "100-lecie zawarcia Konkordatu między Stolicą Apostolską a Rzecząpospolitą Polską",
    issueDate: "2025-02-06",
    coins: [
      { nominal: 20, metal: "Srebro Ag 999", weightGrams: 28.28, dimensionsMm: [40, 28], mintage: 8000, technique: "stempel lustrzany; druk UV" },
    ],
  },
  {
    act: "MP/2025/117",
    topic: "Polskie banknoty obiegowe – Banknot o nominale 50 zł",
    issueDate: "2025-03-06",
    coins: [
      { nominal: 50, metal: "Złoto Au 999,9", weightGrams: 31.1, dimensionsMm: [50, 25], mintage: 1500, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2025/214",
    topic: "Hetmani Rzeczypospolitej – Stanisław Koniecpolski",
    issueDate: "2025-03-26",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 31.1, diameterMm: 32, mintage: 8000, technique: "stempel lustrzany; wysoki relief" },
      { nominal: 500, metal: "Złoto Au 999,9", weightGrams: 31.1, diameterMm: 32, mintage: 1000, technique: "stempel lustrzany; wysoki relief" },
    ],
  },
  {
    act: "MP/2025/268",
    topic: "85. rocznica zbrodni katyńskiej",
    issueDate: "2025-04-08",
    coins: [
      { nominal: 50, metal: "Srebro Ag 999", weightGrams: 62.2, diameterMm: 45, mintage: 5000, technique: "stempel lustrzany; wysoki relief; selektywne platerowanie" },
    ],
  },
  {
    act: "MP/2025/297",
    topic: "Tysiąclecie koronacji Bolesława Chrobrego",
    issueDate: "2025-04-16",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 14.14, diameterMm: 32, mintage: 10000, technique: "stempel lustrzany; selektywne złocenie" },
      { nominal: 100, metal: "Srebro Ag 999", weightGrams: 311, dimensionsMm: [29, 29, 35.5], shape: "cuboid", mintage: 1025, technique: "stempel lustrzany i zwykły; matowanie laserowe; wybłyszczenie reliefu" },
      { nominal: 500, metal: "Złoto Au 999,9", weightGrams: 62.2, dimensionsMm: [40, 40], shape: "square", mintage: 1025, technique: "stempel lustrzany; bursztyn" },
    ],
  },
  {
    act: "MP/2025/339",
    topic: "45. rocznica powstania NSZZ Solidarność",
    issueDate: "2025-04-25",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 14.14, diameterMm: 32, mintage: 9000, technique: "stempel lustrzany; druk UV" },
    ],
  },
  {
    act: "MP/2025/384",
    topic: "Odkryj Polskę – Tykocin",
    issueDate: "2025-05-22",
    coins: [
      { nominal: 5, metal: "Pierścień MN25, rdzeń CuAl6Ni2", weightGrams: 6.54, diameterMm: 24, mintage: 1000000, technique: "standard obiegowy" },
    ],
  },
  {
    act: "MP/2025/463",
    topic: "W Polskę wierzę – Jasna Góra – duchowa stolica Polski",
    issueDate: "2025-05-27",
    coins: [
      { nominal: 10, metal: "Srebro Ag 925", weightGrams: 14.14, diameterMm: 32, mintage: 9000, technique: "stempel lustrzany; druk UV" },
    ],
  },
  {
    act: "MP/2025/523",
    topic: "Hetmani Rzeczypospolitej – Stanisław Żółkiewski",
    issueDate: "2025-06-12",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 31.1, diameterMm: 32, mintage: 8000, technique: "stempel lustrzany; wysoki relief" },
      { nominal: 500, metal: "Złoto Au 999,9", weightGrams: 31.1, diameterMm: 32, mintage: 1000, technique: "stempel lustrzany; wysoki relief" },
    ],
  },
  {
    act: "MP/2025/538",
    topic: "80. rocznica powrotu Polski na Ziemie Zachodnie i Północne",
    issueDate: "2025-06-26",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 14.14, dimensionsMm: [28.2, 28.2], shape: "square", mintage: 8000, technique: "stempel lustrzany; druk UV" },
    ],
  },
  {
    act: "MP/2025/613",
    topic: "Pamięci księdza Franciszka Blachnickiego",
    issueDate: "2025-07-17",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 14.14, diameterMm: 32, mintage: 8000, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2025/715",
    topic: "Historia monety polskiej – 3 grosze Księstwa Warszawskiego",
    issueDate: "2025-08-21",
    coins: [
      { nominal: 20, metal: "Srebro Ag 925", weightGrams: 28.28, diameterMm: 38.61, mintage: 10000, technique: "stempel lustrzany; selektywne platerowanie" },
    ],
  },
  {
    act: "MP/2025/725",
    topic: "W Polskę wierzę – Pieśń Rota",
    issueDate: "2025-09-10",
    coins: [
      { nominal: 10, metal: "Srebro Ag 925", weightGrams: 14.14, diameterMm: 32, mintage: 9000, technique: "stempel lustrzany; druk UV" },
    ],
  },
  {
    act: "MP/2025/1007",
    topic: "Hetmani Rzeczypospolitej – Jan Karol Chodkiewicz",
    issueDate: "2025-10-23",
    coins: [
      { nominal: 10, metal: "Srebro Ag 999", weightGrams: 31.1, diameterMm: 32, mintage: 8000, technique: "stempel lustrzany; wysoki relief" },
      { nominal: 500, metal: "Złoto Au 999,9", weightGrams: 31.1, diameterMm: 32, mintage: 1000, technique: "stempel lustrzany; wysoki relief" },
    ],
  },
  {
    act: "MP/2025/1129",
    topic: "Odkryj Polskę – Ratusz w Brzegu",
    issueDate: "2025-11-20",
    coins: [
      { nominal: 5, metal: "Pierścień MN25, rdzeń CuAl6Ni2", weightGrams: 6.54, diameterMm: 24, mintage: 1000000, technique: "standard obiegowy" },
    ],
  },
  {
    act: "MP/2025/1130",
    topic: "Historia monety polskiej – 5 złotych z okresu powstania listopadowego",
    issueDate: "2025-11-26",
    coins: [
      { nominal: 20, metal: "Srebro Ag 925", weightGrams: 28.28, diameterMm: 38.61, mintage: 10000, technique: "stempel lustrzany" },
    ],
  },
  {
    act: "MP/2025/1210",
    topic: "Skarby sztuki medalierskiej – Michał Ossowski",
    issueDate: "2025-12-09",
    coins: [
      { nominal: 50, metal: "Srebro Ag 999", weightGrams: 62.2, diameterMm: 45, mintage: 5000, technique: "wysoki relief" },
    ],
  },
];

const ISSUE_GROUPS = [...ISSUE_GROUPS_2023, ...ISSUE_GROUPS_2024, ...ISSUE_GROUPS_2025];
const ISSUED_2026_ACTS = [
  "MP/2026/172",
  "MP/2026/240",
  "MP/2026/347",
  "MP/2026/416",
  "MP/2026/417",
  "MP/2026/504",
  "MP/2026/553",
  "MP/2026/615",
];
const SCHEDULED_2026_ACTS = ["MP/2026/856"];

function normalizedSlug(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sourceFor(group) {
  return {
    type: "official-legal-act",
    name: "Monitor Polski / ELI oraz plan emisyjny NBP",
    recordId: group.act,
    url: `https://eli.gov.pl/eli/${group.act}/ogl`,
    retrievedAt: RETRIEVED_AT,
    rights: "Wyłącznie znormalizowane fakty emisyjne z urzędowego aktu i planu NBP; bez opisów i ilustracji",
    rightsCode: "factual-metadata-only",
    restricted: false,
    accessMode: "official-act-and-plan-normalized-facts",
  };
}

function expandRecord(group, coin) {
  const year = group.issueDate.slice(0, 4);
  const nominal = `${coin.nominal} zł`;
  const shape = coin.shape || (coin.dimensionsMm ? "rectangular" : "round");
  const id = `nbp-eli:${year}-${normalizedSlug(group.topic)}-${coin.nominal}-zl`;
  const markers = [
    group.topic,
    nominal,
    coin.metal,
    coin.technique,
    coin.diameterMm ? `średnica ${coin.diameterMm} mm` : `wymiary ${coin.dimensionsMm.join(" × ")} mm`,
  ].filter(Boolean);
  return {
    id,
    title: `${group.topic}, ${nominal}, ${year}`,
    objectKind: "coin",
    country: "Polska",
    ruler: "Narodowy Bank Polski",
    year,
    period: "third-republic",
    nominal,
    metal: coin.metal,
    mint: "Warszawa",
    shape,
    weightGrams: coin.weightGrams,
    diameterMm: coin.diameterMm || null,
    ...(coin.dimensionsMm ? { dimensionsMm: coin.dimensionsMm } : {}),
    issueDate: group.issueDate,
    mintage: coin.mintage,
    portrait: group.topic,
    obverseLegend: `RZECZPOSPOLITA POLSKA ${year}`,
    reverseLegend: "",
    diagnosticMarkers: markers,
    images: [],
    source: sourceFor(group),
    verificationSources: [
      {
        role: "official-issuance-act",
        id: group.act,
        url: `https://eli.gov.pl/eli/${group.act}/ogl`,
      },
      {
        role: "official-issue-plan-technical-facts",
        id: `NBP plan emisji ${year}`,
        url: PLAN_URLS[year],
      },
    ],
  };
}

const records = ISSUE_GROUPS.flatMap((group) => group.coins.map((coin) => expandRecord(group, coin)));

async function checkLiveEliIndex() {
  const covered = new Set(ISSUE_GROUPS.map((group) => group.act));
  // This act was published in 2025 for a coin introduced in January 2026 and
  // belongs to the separate 2026 NBP catalogue.
  covered.add("MP/2025/1243");
  for (const act of ISSUED_2026_ACTS) covered.add(act);
  // Halina Konopacka enters circulation on 2026-09-01. Its act is known, but
  // the active recognition catalogue excludes issues scheduled after the retrieval date.
  for (const act of SCHEDULED_2026_ACTS) covered.add(act);

  for (const publicationYear of [2023, 2024, 2025, 2026]) {
    const response = await fetch(`https://api.sejm.gov.pl/eli/acts/MP/${publicationYear}?limit=2000`, {
      headers: { Accept: "application/json", "User-Agent": "APOMONET-source-audit/1.0" },
    });
    if (!response.ok) throw new Error(`ELI API ${publicationYear}: HTTP ${response.status}`);
    const body = await response.json();
    const coinActs = (body.items || []).filter((item) =>
      /Prezesa Narodowego Banku Polskiego/i.test(item.title) &&
      /emisji monet(?:y)?\b/i.test(item.title),
    );
    const missing = coinActs.filter((item) => !covered.has(item.ELI));
    if (missing.length) {
      throw new Error(`Nieprzejrzane akty emisyjne ELI ${publicationYear}: ${missing.map((item) => item.ELI).join(", ")}`);
    }
    console.log(`[ELI] ${coinActs.length} aktów monetarnych opublikowanych w ${publicationYear} r.; wszystkie przypisane`);
  }
}

if (args.has("--check-live")) await checkLiveEliIndex();

const catalog = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  policy: {
    purpose: "Potwierdzone urzędowymi aktami polskie emisje monet z lat 2023–2025",
    sourceMode: "Monitor Polski / ELI plus techniczne fakty z oficjalnego planu NBP",
    rightsGate: "Tylko znormalizowane fakty; bez kopiowania opisów, tabel, układu i ilustracji",
    plannedIssuesExcluded: true,
    provenanceRequired: true,
  },
  stats: {
    records: records.length,
    issueGroups: ISSUE_GROUPS.length,
    legalActs: new Set(ISSUE_GROUPS.map((group) => group.act)).size,
    withMeasurements: records.filter((record) => record.weightGrams && (record.diameterMm || record.dimensionsMm)).length,
    withImages: records.filter((record) => record.images.length).length,
  },
  records,
};

if (!args.has("--dry-run")) {
  await writeFile(OUTPUT, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(`[write] ${OUTPUT}`);
}
console.log(JSON.stringify(catalog.stats, null, 2));

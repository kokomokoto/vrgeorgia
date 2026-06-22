/**
 * თბილისის ოფიციალური უბნები — MSDA msm_z__gis_data_00171 (ms.gov.ge).
 * ერთი წყარო: რუკის ფენა, არჩევა, ავტომატური მონიშვნა.
 */
export type TbilisiSubdistrict = { key: string; ka: string };

export type TbilisiOfficialUbani = {
  key: string;
  ka: string;
  saxeli: string;
  nn: string;
  districtGroup: TbilisiDistrictGroupKey;
  color: string;
};

export type TbilisiDistrictGroupKey =
  | 'old_tbilisi'
  | 'vake_saburtalo'
  | 'isani_samgori'
  | 'krtsanisi'
  | 'didube_chughureti'
  | 'gldani_nadzaladevi';

/** MSDA WFS — 35 საუბნო ზონა */
export const TBILISI_OFFICIAL_UBANI: TbilisiOfficialUbani[] = [
  { nn: 'I-1', saxeli: 'mTawminda, sololaki', key: 'sub_mtatsminda_sololaki', ka: 'მთაწმინდა, სოლოლაკი', districtGroup: 'old_tbilisi', color: '#818cf8' },
  { nn: 'I-2', saxeli: 'vere', key: 'sub_vera', ka: 'ვერე', districtGroup: 'old_tbilisi', color: '#6366f1' },
  { nn: 'I-3', saxeli: 'kikeTi, kojori', key: 'sub_kiketi_kojori', ka: '\u10D9\u10D8\u10D9\u10D4\u10D7\u10D8, \u10D9\u10DD\u10EF\u10DD\u10E0\u10D8', districtGroup: 'old_tbilisi', color: '#4f46e5' },
  { nn: 'I-3', saxeli: 'samadlo', key: 'sub_samadlo', ka: '\u10E1\u10D0\u10DB\u10D0\u10D3\u10DA\u10DD', districtGroup: 'old_tbilisi', color: '#4338ca' },
  { nn: 'I-4', saxeli: 'wavkisi,Sindisi, tabaxmela', key: 'sub_wavkisi_sindisi_tbaksmela', ka: 'წავკისი, შინდისი, ტაბახმელა', districtGroup: 'old_tbilisi', color: '#3730a3' },
  { nn: 'II-5', saxeli: 'vake, bagebi', key: 'sub_vake_bagebi', ka: '\u10D5\u10D0\u10D9\u10D4, \u10D1\u10D0\u10D2\u10D4\u10D1\u10D8', districtGroup: 'vake_saburtalo', color: '#3b82f6' },
  { nn: 'II-6', saxeli: 'vaJa-fSavelas kvartlebi', key: 'sub_vazha_pshavela', ka: '\u10D5\u10D0\u10DF\u10D0-\u10E4\u10E8\u10D0\u10D5\u10D4\u10DA\u10D0\u10E1 \u10D9\u10D5\u10D0\u10E0\u10E2\u10DA\u10D4\u10D1\u10D8', districtGroup: 'vake_saburtalo', color: '#2563eb' },
  { nn: 'II-7', saxeli: 'nucubiZis mikroraionebi', key: 'sub_nutsubidze_mikro', ka: '\u10DC\u10E3\u10EA\u10E3\u10D1\u10D8\u10EB\u10D8\u10E1 \u10DB\u10D8\u10D9\u10E0\u10DD\u10E0\u10D0\u10D8\u10DD\u10DC\u10D4\u10D1\u10D8', districtGroup: 'vake_saburtalo', color: '#1d4ed8' },
  { nn: 'II-8', saxeli: 'wyneTi', key: 'sub_wyneti', ka: 'წყნეთი', districtGroup: 'vake_saburtalo', color: '#1e40af' },
  { nn: 'III-9', saxeli: 'diRomi, vaSlijvari', key: 'sub_dighomi_vashlijvari', ka: '\u10D3\u10D8\u10E6\u10DD\u10DB\u10D8, \u10D5\u10D0\u10E8\u10DA\u10D8\u10EF\u10D5\u10D0\u10E0\u10D8', districtGroup: 'vake_saburtalo', color: '#0ea5e9' },
  { nn: 'III-10', saxeli: 'veZisi, yazbegi, goTua, saburTalo', key: 'sub_vedzisi_yazbegi_gotua_saburtalo', ka: 'ვეძისი, ყაზბეგი, გოთუა, საბურთალო', districtGroup: 'vake_saburtalo', color: '#0284c7' },
  { nn: 'III-11', saxeli: 'kostava, baxtrioni, doliZe, xiliani', key: 'sub_kostava_baxtrioni_dolize_xiliani', ka: 'კოსტავა, ბახტრიონი, დოლიძე, ხილიანი', districtGroup: 'vake_saburtalo', color: '#0369a1' },
  { nn: 'III-11', saxeli: 'xiliani', key: 'sub_xiliani', ka: '\u10EE\u10D8\u10DA\u10D8\u10D0\u10DC\u10D8', districtGroup: 'vake_saburtalo', color: '#075985' },
  { nn: 'IV-12', saxeli: 'kala, orTaWala', key: 'sub_kala_ortachala', ka: 'კალა, ორთაჭალა', districtGroup: 'krtsanisi', color: '#14b8a6' },
  { nn: 'IV-13', saxeli: 'foniWala', key: 'sub_ponichala', ka: '\u10E4\u10DD\u10DC\u10D8\u10ED\u10D0\u10DA\u10D0', districtGroup: 'krtsanisi', color: '#0d9488' },
  { nn: 'V-14', saxeli: 'zemo avlabari, metromSeni', key: 'sub_zemo_avlabari_metromtseni', ka: 'ზემო ავლაბარი, მეტრომშენი', districtGroup: 'isani_samgori', color: '#059669' },
  { nn: 'V-15', saxeli: 'navTluRi', key: 'sub_navtlughi', ka: 'ნავთლუღი', districtGroup: 'isani_samgori', color: '#047857' },
  { nn: 'V-16', saxeli: 'vazisubani, me-8 legioni', key: 'sub_vazisubani_legioni', ka: '\u10D5\u10D0\u10D6\u10D8\u10E1\u10E3\u10D1\u10D0\u10DC\u10D8, \u10DB\u10D4-8 \u10DA\u10D4\u10D2\u10D8\u10DD\u10DC\u10D8', districtGroup: 'isani_samgori', color: '#10b981' },
  { nn: 'VI-17', saxeli: 'varkeTili', key: 'sub_varketili', ka: '\u10D5\u10D0\u10E0\u10D9\u10D4\u10D7\u10D8\u10DA\u10D8', districtGroup: 'isani_samgori', color: '#16a34a' },
  { nn: 'VI-18', saxeli: 'mesame masivi', key: 'sub_mesame_masivi', ka: '\u10DB\u10D4\u10E1\u10D0\u10DB\u10D4 \u10DB\u10D0\u10E1\u10D8\u10D5\u10D8', districtGroup: 'isani_samgori', color: '#15803d' },
  { nn: 'VI-19', saxeli: 'orxevi, aeroporti', key: 'sub_orkhevi_aeroporti', ka: '\u10DD\u10E0\u10EE\u10D4\u10D5\u10D8, \u10D0\u10D4\u10E0\u10DD\u10DE\u10DD\u10E0\u10E2\u10D8', districtGroup: 'isani_samgori', color: '#22c55e' },
  { nn: 'VI-20', saxeli: 'lilo', key: 'sub_lilo', ka: '\u10DA\u10D8\u10DA\u10DD', districtGroup: 'isani_samgori', color: '#4ade80' },
  { nn: 'VI-21', saxeli: 'qvemo samgori', key: 'sub_qvemo_samgori', ka: '\u10E5\u10D5\u10D4\u10DB\u10DD \u10E1\u10D0\u10DB\u10D2\u10DD\u10E0\u10D8', districtGroup: 'isani_samgori', color: '#86efac' },
  { nn: 'VII-22', saxeli: 'zemo CuRureTi', key: 'sub_zemo_chughureti', ka: '\u10D6\u10D4\u10DB\u10DD \u10E9\u10E3\u10E6\u10E3\u10E0\u10D4\u10D7\u10D8', districtGroup: 'didube_chughureti', color: '#8b5cf6' },
  { nn: 'VII-23', saxeli: 'qveda CuRureTi', key: 'sub_qveda_chughureti', ka: '\u10E5\u10D5\u10D4\u10D3\u10D0 \u10E9\u10E3\u10E6\u10E3\u10E0\u10D4\u10D7\u10D8', districtGroup: 'didube_chughureti', color: '#7c3aed' },
  { nn: 'VIII-24', saxeli: 'didube', key: 'sub_didube', ka: '\u10D3\u10D8\u10D3\u10E3\u10D1\u10D4', districtGroup: 'didube_chughureti', color: '#a855f7' },
  { nn: 'VIII-25', saxeli: 'diRmis masivi', key: 'sub_dighmis_masivi', ka: '\u10D3\u10D8\u10E6\u10DB\u10D8\u10E1 \u10DB\u10D0\u10E1\u10D8\u10D5\u10D8', districtGroup: 'didube_chughureti', color: '#9333ea' },
  { nn: 'IX-26', saxeli: 'Zveli naZaladevi, lotkini', key: 'sub_zveli_nadzaladevi_lotkini', ka: '\u10EB\u10D5\u10D4\u10DA\u10D8 \u10DC\u10D0\u10EB\u10D0\u10DA\u10D0\u10D3\u10D4\u10D5\u10D8, \u10DA\u10DD\u10E2\u10D9\u10D8\u10DC\u10D8', districtGroup: 'gldani_nadzaladevi', color: '#f59e0b' },
  { nn: 'IX-27', saxeli: 'naZaladevi', key: 'sub_nadzaladevi', ka: '\u10DC\u10D0\u10EB\u10D0\u10DA\u10D0\u10D3\u10D4\u10D5\u10D8', districtGroup: 'gldani_nadzaladevi', color: '#d97706' },
  { nn: 'IX-28', saxeli: 'sanzona', key: 'sub_sanzona', ka: '\u10E1\u10D0\u10DC\u10D6\u10DD\u10DC\u10D0', districtGroup: 'gldani_nadzaladevi', color: '#b45309' },
  { nn: 'IX-29', saxeli: 'Temqa', key: 'sub_temqa', ka: '\u10D7\u10D4\u10DB\u10E5\u10D0', districtGroup: 'gldani_nadzaladevi', color: '#92400e' },
  { nn: 'X-30', saxeli: 'avWala, gldanis xevi', key: 'sub_avchala_gldanis_xevi', ka: '\u10D0\u10D5\u10ED\u10D0\u10DA\u10D0, \u10D2\u10DA\u10D3\u10D0\u10DC\u10D8\u10E1 \u10EE\u10D4\u10D5\u10D8', districtGroup: 'gldani_nadzaladevi', color: '#ef4444' },
  { nn: 'X-31', saxeli: 'gldanis luwi mikroraionebi', key: 'sub_gldani_qve_mikro', ka: 'გლდანის ლუწი მიკრორაიონები', districtGroup: 'gldani_nadzaladevi', color: '#dc2626' },
  { nn: 'X-32', saxeli: 'gldanis kenti mikroraionebi', key: 'sub_gldani_qenti_mikro', ka: 'გლდანის კენტი მიკრორაიონები', districtGroup: 'gldani_nadzaladevi', color: '#b91c1c' },
  { nn: 'X-33', saxeli: 'muxiani', key: 'sub_mukhiani', ka: '\u10DB\u10E3\u10EE\u10D8\u10D0\u10DC\u10D8', districtGroup: 'gldani_nadzaladevi', color: '#991b1b' },
];

const GROUP_LABELS: Record<TbilisiDistrictGroupKey, string> = {
  old_tbilisi: 'district_old_tbilisi',
  vake_saburtalo: 'district_vake_saburtalo',
  isani_samgori: 'district_isani_samgori',
  krtsanisi: 'district_krtsanisi',
  didube_chughureti: 'district_didube_chughureti',
  gldani_nadzaladevi: 'district_gldani_nadzaladevi',
};

function buildTbilisiDistricts() {
  const groups: Record<
    TbilisiDistrictGroupKey,
    { labelKey: string; subdistricts: TbilisiSubdistrict[] }
  > = {
    old_tbilisi: { labelKey: GROUP_LABELS.old_tbilisi, subdistricts: [] },
    vake_saburtalo: { labelKey: GROUP_LABELS.vake_saburtalo, subdistricts: [] },
    isani_samgori: { labelKey: GROUP_LABELS.isani_samgori, subdistricts: [] },
    krtsanisi: { labelKey: GROUP_LABELS.krtsanisi, subdistricts: [] },
    didube_chughureti: { labelKey: GROUP_LABELS.didube_chughureti, subdistricts: [] },
    gldani_nadzaladevi: { labelKey: GROUP_LABELS.gldani_nadzaladevi, subdistricts: [] },
  };

  for (const ubani of TBILISI_OFFICIAL_UBANI) {
    groups[ubani.districtGroup].subdistricts.push({ key: ubani.key, ka: ubani.ka });
  }

  return groups;
}

export const TBILISI_DISTRICTS = buildTbilisiDistricts();

export const TBILISI_ZONE_KEY_MAP: Record<string, { districtKey: TbilisiDistrictGroupKey; ka: string }> =
  Object.fromEntries(
    TBILISI_OFFICIAL_UBANI.map((u) => [u.key, { districtKey: u.districtGroup, ka: u.ka }])
  );

/** ძველი განცხადებების სახელები → MSDA ოფიციალური */
export const TBILISI_LEGACY_KA_ALIASES: Record<string, string> = {
  '\u10DC\u10E3\u10EA\u10E3\u10D1\u10D8\u10EB\u10D8\u10E1 \u10E4\u10D4\u10E0\u10D3\u10DD\u10D1\u10D8': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_nutsubidze_mikro')!.ka,
  '\u10E1\u10D0\u10D1\u10E3\u10E0\u10E2\u10D0\u10DA\u10DD': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_vedzisi_yazbegi_gotua_saburtalo')!.ka,
  '\u10D5\u10D0\u10D9\u10D4': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_vake_bagebi')!.ka,
  '\u10D1\u10D0\u10D2\u10D4\u10D1\u10D8': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_vake_bagebi')!.ka,
  '\u10DB\u10E2\u10D0\u10EC\u10DB\u10D8\u10DC\u10D3\u10D0': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_mtatsminda_sololaki')!.ka,
  '\u10E1\u10DD\u10DA\u10DD\u10DA\u10D0\u10D9\u10D8': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_mtatsminda_sololaki')!.ka,
  '\u10E1\u10DD\u10E4. \u10D3\u10D8\u10D2\u10D9\u10DB\u10D8': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_dighomi_vashlijvari')!.ka,
  '\u10E9\u10E3\u10D2\u10E3\u10E0\u10D4\u10D7\u10D8': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_qveda_chughureti')!.ka,
  '\u10D2\u10DA\u10D3\u10D0\u10DC\u10D8': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_gldani_qenti_mikro')!.ka,
  '\u10DB\u10D4\u10E1\u10D0\u10DB\u10D4 \u10DB\u10D0\u10E1\u10D8\u10D5\u10D8': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_mesame_masivi')!.ka,
  '\u10D3\u10D8\u10D2\u10DB\u10D8\u10E1 \u10DB\u10D0\u10E1\u10D8\u10D5\u10D8': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_dighmis_masivi')!.ka,
  '\u10D0\u10D5\u10ED\u10D0\u10DA\u10D0': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_avchala_gldanis_xevi')!.ka,
  '\u10D0\u10D5\u10DA\u10D0\u10D1\u10D0\u10E0\u10D8': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_zemo_avlabari_metromtseni')!.ka,
  '\u10DD\u10E0\u10D7\u10D0\u10ED\u10D0\u10DA\u10D0': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_kala_ortachala')!.ka,
  '\u10E1\u10D0\u10DB\u10D2\u10DD\u10E0\u10D8': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_qvemo_samgori')!.ka,
  'მტაწმინდა, სოლოლაკი': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_mtatsminda_sololaki')!.ka,
  'ვერა': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_vera')!.ka,
  'ვაშკისი, სინდისი, თბაქსპელა': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_wavkisi_sindisi_tbaksmela')!.ka,
  'წინეთი': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_wyneti')!.ka,
  'ვეძისი, იაზბეგი, გოტუა, საბურტალო': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_vedzisi_yazbegi_gotua_saburtalo')!.ka,
  'კოსტავა, ბახტრიონი, დოლიზე, ხილიანი': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_kostava_baxtrioni_dolize_xiliani')!.ka,
  'ყალა, ორთაჭალა': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_kala_ortachala')!.ka,
  'ზემო ავლაბარი, მეტრომღენი': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_zemo_avlabari_metromtseni')!.ka,
  'ნავტლუგი': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_navtlughi')!.ka,
  'გლდანის ქვე მიკრორაიონები': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_gldani_qve_mikro')!.ka,
  'გლდანის ყენთი მიკრორაიონები': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_gldani_qenti_mikro')!.ka,
  'გლდანის კენტი მიკრო რაიონები': TBILISI_OFFICIAL_UBANI.find((u) => u.key === 'sub_gldani_qenti_mikro')!.ka,
  'ძველი თბილისი': 'მთაწმინდა',
};

export function normalizeTbilisiSubdistrictKa(ka: string): string {
  return TBILISI_LEGACY_KA_ALIASES[ka] ?? ka;
}

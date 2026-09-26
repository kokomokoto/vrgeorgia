export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'user.updated': 'მომხმარებელი განახლდა',
  'user.password_reset': 'პაროლი განულდა',
  'user.approved': 'რეგისტრაცია დამტკიცდა',
  'user.rejected': 'რეგისტრაცია უარყოფილია',
  'user.deleted': 'მომხმარებელი წაიშალა',
  'agent.verified': 'აგენტი ვერიფიცირდა',
  'agent.unverified': 'ვერიფიკაცია გაუქმდა',
  'agent.deleted': 'აგენტი წაიშალა',
  'property.status_changed': 'განცხადების სტატუსი შეიცვალა',
  'property.bulk_status_changed': 'მასიური სტატუსის ცვლილება',
  'property.deleted': 'განცხადება ნაგვის ყუთში',
  'property.deleted_by_owner': 'მფლობელმა წაშალა (ნაგვის ყუთი)',
  'property.transferred': 'განცხადება სხვა აგენტზე გადაეცა',
  'property.restored': 'განცხადება აღდგა',
  'property.permanently_deleted': 'განცხადება სამუდამოდ წაიშალა',
  'property.duplicates_merged': 'დუბლიკატები გაერთიანდა',
  'property.pins_reordered': 'აპინული განცხადებების რიგი შეიცვალა',
  'property.pinned': 'განცხადება აპინდა',
  'property.unpinned': 'აპინვა მოხსნილია',
  'tour.created': '3D ტური შეიქმნა',
  'tour.renamed': '3D ტურის სახელი შეიცვალა',
  'tour.deleted': '3D ტური წაიშალა',
  'tour.trashed': '3D ტური ნაგვის ყუთში გადავიდა',
  'tour.restored_from_trash': '3D ტური ნაგვის ყუთიდან აღდგა',
  'tour.removed': '3D ტური მოხსნილია',
  'tour.published': '3D ტური გამოქვეყნდა',
  'tour.scene_created': 'სცენა დაემატა',
  'tour.scene_renamed': 'სცენას სახელი შეეცვალა',
  'tour.scene_deleted': 'სცენა წაიშალა',
  'tour.scenes_reordered': 'სცენების რიგი შეიცვალა',
  'tour.panorama_uploaded': 'პანორამა აიტვირთა',
  'tour.panorama_replaced': 'პანორამა შეიცვალა',
  'tour.hotspot_created': 'გადასასვლელი დაემატა',
  'tour.hotspot_deleted': 'გადასასვლელი წაიშალა',
  update_site_content: 'საიტის ტექსტი განახლდა',
  create_home_design_preset: 'მთავარი გვერდის პრესეტი შეიქმნა',
  update_home_design_preset: 'მთავარი გვერდის პრესეტი განახლდა',
  delete_home_design_preset: 'მთავარი გვერდის პრესეტი წაიშალა',
};

export const AUDIT_TARGET_LABELS: Record<string, string> = {
  user: 'მომხმარებელი',
  agent: 'აგენტი',
  property: 'განცხადება',
  tour: '3D ტური',
  site_content: 'საიტი',
};

export function auditActionLabel(action: string) {
  return AUDIT_ACTION_LABELS[action] || action;
}

export function auditTargetLabel(type: string) {
  return AUDIT_TARGET_LABELS[type] || type;
}

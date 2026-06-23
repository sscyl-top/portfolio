-- 补充全局文字管理表的额外数据（Hero、CTA、Footer 等）
-- 在运行完 20260623082900_create_text_content.sql 后执行此文件

INSERT INTO public.text_content (key, content, font_size, font_family, font_weight, color, page, section, sort_order) VALUES
('brand.logo_alt', '无限进步', NULL, NULL, NULL, NULL, 'global', 'navigation', 5),
('hero.title.desktop', '让品牌视觉拥有可被记住的数字现场', NULL, NULL, NULL, NULL, 'home', 'hero', 4),
('hero.title.mobile', '让品牌视觉拥有被记住的数字现场', NULL, NULL, NULL, NULL, 'home', 'hero', 5),
('hero.experience', '品牌视觉与商业设计实践', NULL, NULL, NULL, NULL, 'home', 'hero', 6),
('hero.cta.works', '查看作品', NULL, NULL, NULL, NULL, 'home', 'hero', 7),
('hero.cta.resume', '下载简历', NULL, NULL, NULL, NULL, 'home', 'hero', 8),
('contact.invitation', '期待一起共事：', NULL, NULL, NULL, NULL, 'home', 'contact', 1),
('cta.works', '浏览作品', NULL, NULL, NULL, NULL, 'home', 'cta', 1),
('cta.resume', '查看简历', NULL, NULL, NULL, NULL, 'home', 'cta', 2),
('cta.hiring', '聘用联系', NULL, NULL, NULL, NULL, 'home', 'cta', 3),
('footer.copyright', '© 2026 SSCYL Portfolio', NULL, NULL, NULL, NULL, 'global', 'footer', 3)
ON CONFLICT (key) DO NOTHING;

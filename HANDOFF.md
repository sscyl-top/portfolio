# ��Ʒ����վ - ��Ŀ�����ĵ�

## ��Ŀ�ſ�
- ��Ŀ����SSCYL Portfolio����Ʒ����վ��
- �ֿ⣺https://github.com/sscyl-top/portfolio.git
- ���ϵ�ַ��https://sscyl.top
- ����ƽ̨��Vercel����Ŀ sscyl/portfolio��
- ���ݿ⣺Supabase����Ŀ hnujowombcgfxledpnxe��
- ����ջ��Next.js 16.2.9 + TypeScript + Tailwind CSS + Three.js + GSAP

## ·�ɽṹ
| ·�� | ˵�� |
|------|------|
| / | ��ҳ��HeroShowcase + CapabilityBands ����3D�� |
| /works | ��Ʒ�����������ֲ� + ȫ����Ʒ + �������ǽ�� |
| /works/[slug] | ��Ʒ����ҳ |
| /resume | ����ҳ |
| /admin | ��̨���������¼�� |
| /admin/works | ��Ʒ���� |
| /admin/works/[id] | ��Ʒ�༭ |
| /api/contact | ��ϵ����API |

## ����ɵĺ��Ĺ���
1. ��ҳ����3D����������AmbientParticles��
2. ��ҳ��������5����壨CapabilityBands + ������״�任��
3. �ֻ��˴�����7���ֲ����̶�slot key + CSS transition + ��߽������
4. ���Զ˴���������չ����hover������
5. ȫ����Ʒ����ɸѡ��WorksExplorer��
6. �������ǽ��CompositeDesignWall��
7. ����ҳ�����Ű�
8. ��̨��������ƷCRUD�����ࡢý�塢ҳ�����ã�
9. Supabase���ݿ��д
10. Vercel���� + �Զ������� sscyl.top

## �ؼ��ļ�
- src/components/works/RepresentativeWorks.tsx �� �������ֲ����ֻ�+���ԣ�
- src/components/home/CapabilityBands.tsx �� ��������3D�������
- src/components/home/HeroShowcase.tsx �� ��ҳ��һ��
- src/components/home/AmbientParticles.tsx �� ��ҳ����
- src/components/site/SiteHeader.tsx �� ������
- src/data/portfolio.ts �� ��̬����
- src/lib/cms/repository.ts �� Supabase���ݲ�
- src/app/layout.tsx �� ������

## ���ؿ���
```bash
cd "D:\��ɽ��������̨ʽ\��Ʒ����վ\2026-��Ʒ����վ"
npm run dev    # ������ http://localhost:3000
```

## ��������
```bash
npx vercel deploy --prod --yes --token <VERCEL_TOKEN>
```

## ����ɹ���
1. ��ҳ�ƶ����Ż�δ��ɣ�
   - �������ұ�logo���ֻ��˲��ɼ�
   - �������ư����̫��Ӣ�Ĵ�����ʽ�ָ�
   - �ճ�������ť�������Ʒ���鿴������Ƹ����ϵ���ĳɺ���һ��
   - �ײ���CTA���������Ҫ����
2. �ֻ�������ҳ�������ȷ��
3. ��̨�������������ܲ���
4. SEO�Ż���meta��ǩ��sitemap��

## ��֪ע������
- ��ʱ�ļ���temp_*.tsx���ᵼ��Vercel����ʧ�ܣ�����ǰ��ɾ��
- ��Ŀʹ�� Turbopack ����
- Supabase ���ؿ����� http://127.0.0.1:54321
- Vercel token �����ڲ��������Ʊ���

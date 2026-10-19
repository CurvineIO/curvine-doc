import Link from 'next/link';

export const metadata = { title: '社区' };

const CHANNELS = [
  { title: 'Discord', description: '与 Curvine 维护者和其他用户交流。', href: 'https://discord.com/invite/xfxMQKv3' },
  { title: 'Slack', description: '加入 Curvine 工作区参与更深入的讨论。', href: 'https://join.slack.com/t/curvineio/shared_invite/zt-4673r43cn-prajma_q5ZI3BUxuaY5kiQ' },
  { title: 'X', description: '在 X 上关注项目公告。', href: 'https://x.com/szbr8896' },
  { title: 'GitHub', description: '源代码、Issue 与讨论。', href: 'https://github.com/curvineio/curvine' },
  { title: '博客', description: '性能测试、架构解读与版本说明。', href: '/zh-cn/blog' },
];

export default function CommunityPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">社区活动</h1>
      <p className="mt-4 max-w-2xl text-fd-muted-foreground">
        Curvine 是基于 Apache 2.0 协议的开源项目，欢迎加入社区提问、反馈问题或参与贡献。
      </p>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {CHANNELS.map((channel) => (
          <Link
            key={channel.title}
            href={channel.href}
            className="rounded-xl border bg-fd-card p-5 transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            <h2 className="font-medium">{channel.title}</h2>
            <p className="mt-1.5 text-sm text-fd-muted-foreground">{channel.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}

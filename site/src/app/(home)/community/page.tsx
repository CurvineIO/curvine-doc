export const metadata = { title: 'Community' };

const CHANNELS = [
  {
    title: 'Discord',
    description: 'Chat with the Curvine maintainers and other users.',
    href: 'https://discord.com/invite/xfxMQKv3',
  },
  {
    title: 'Slack',
    description: 'Join the Curvine workspace for longer discussions.',
    href: 'https://join.slack.com/t/curvineio/shared_invite/zt-4673r43cn-prajma_q5ZI3BUxuaY5kiQ',
  },
  {
    title: 'X',
    description: 'Follow project announcements on X.',
    href: 'https://x.com/szbr8896',
  },
  {
    title: 'GitHub',
    description: 'Source code, issues and discussions.',
    href: 'https://github.com/curvineio/curvine',
  },
  {
    title: 'Blog',
    description: 'Benchmarks, architecture deep dives and release notes.',
    href: '/blog',
  },
];

export default function CommunityPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-20">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Community Activities</h1>
        <p className="mt-4 max-w-2xl text-fd-muted-foreground">
          Curvine is an open source project released under the Apache 2.0 license. Join the
          community to ask questions, report issues or contribute.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {CHANNELS.map((channel) => (
            <a
              key={channel.title}
              href={channel.href}
              className="rounded-xl border bg-fd-card p-5 transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
              {...(channel.href.startsWith('http')
                ? { target: '_blank', rel: 'noreferrer' }
                : {})}
            >
              <h2 className="font-medium">{channel.title}</h2>
              <p className="mt-1.5 text-sm text-fd-muted-foreground">{channel.description}</p>
            </a>
          ))}
        </div>
      </main>
  );
}

import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components: Components = {
  h2: ({ children }) => <h2 className="blog-h2">{children}</h2>,
  h3: ({ children }) => <h3 className="blog-h3">{children}</h3>,
  p: ({ children }) => <p className="blog-p">{children}</p>,
  ul: ({ children }) => <ul className="blog-ul">{children}</ul>,
  ol: ({ children }) => <ol className="blog-ol">{children}</ol>,
  li: ({ children }) => <li className="blog-li">{children}</li>,
  blockquote: ({ children }) => <blockquote className="blog-blockquote">{children}</blockquote>,
  pre: ({ children }) => <pre className="blog-pre">{children}</pre>,
  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return <code className="blog-code-block">{children}</code>;
    }
    return <code className="blog-code-inline">{children}</code>;
  },
  table: ({ children }) => (
    <div className="blog-table-wrap">
      <table className="blog-table">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th>{children}</th>,
  td: ({ children }) => <td>{children}</td>,
  hr: () => <hr className="blog-hr" />,
  a: ({ href, children }) => (
    <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
      {children}
    </a>
  ),
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
};

interface BlogMarkdownProps {
  content: string;
}

export function BlogMarkdown({ content }: BlogMarkdownProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}

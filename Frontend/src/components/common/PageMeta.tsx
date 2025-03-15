
import { Helmet } from 'react-helmet';

interface PageMetaProps {
  title: string;
  description: string;
}

const PageMeta: React.FC<PageMetaProps> = ({ title, description }) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
    </Helmet>
  );
};

export default PageMeta;

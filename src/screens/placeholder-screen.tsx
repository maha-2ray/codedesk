/**
 * Placeholder for routes that are reachable but not yet implemented.
 *
 * Every navigable destination resolves to a real screen from day one, so the
 * routing and permission model can be exercised end-to-end. Each placeholder
 * names the milestone that will replace it.
 */

import React from 'react';
import { EmptyState, PageHeader } from '../components/ui/primitives';

export const PlaceholderScreen: React.FC<{
  title: string;
  description?: string;
  milestone: string;
}> = ({ title, description, milestone }) => (
  <div className="mx-auto max-w-4xl">
    <PageHeader title={title} description={description} />
    <EmptyState
      title="Not built yet"
      description={`This screen is planned for ${milestone}. The route, layout and access rules are already in place, so the implementation drops straight in.`}
    />
  </div>
);

// components/comments/CommentList.tsx

import { Comment } from '@/app/types/comment'
import { formatDate } from '@/app/lib/utils/formatDate'

interface Props {
  comments: Comment[]
}

export default function CommentList({ comments }: Props) {
  if (comments.length === 0) {
    return (
      <p className="text-gray-400 text-sm mt-4">
        No reviews yet. Be the first to leave one!
      </p>
    )
  }

  return (
    <div className="mt-6 space-y-5">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="bg-white rounded-xl shadow p-5 border border-gray-100"
        >
          {/* Comment header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                {(comment.profiles?.full_name ?? 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {comment.profiles?.full_name ?? 'Anonymous'}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(comment.created_at)}
                </p>
              </div>
            </div>

            {/* Star rating */}
            {comment.rating && (
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg
                    key={i}
                    className={`w-4 h-4 ${
                      i < comment.rating! ? 'text-yellow-400' : 'text-gray-200'
                    } fill-current`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            )}
          </div>

          {/* Comment body */}
          <p className="text-gray-700 text-sm leading-relaxed">{comment.body}</p>

          {/* Admin reply */}
          {comment.admin_reply && (
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-xs font-bold text-orange-600 mb-1">
                Sagitus Team Reply:
              </p>
              <p className="text-sm text-gray-700">{comment.admin_reply}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
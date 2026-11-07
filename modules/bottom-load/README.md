# BottomLoad

Local Expo module, autolinked from `modules/`. Rebuild the dev client after native edits.

The native view attaches to the existing scroll node by tag. It does not wrap or reparent the list, so TrueSheet's `scrollableRef`, FlashList and collapsible tab integration retain their native node.

Android observes the activity window dispatch before RN/TrueSheet can intercept. It only consumes a single-finger upward gesture at the bottom, cancels the prior native/React touch once, and uses the Material `CircularProgressDrawable`. It never scrolls or translates the content. The indicator attaches to the current window overlay (reattached after TrueSheet reparenting), anchors to the sheet viewport rather than short content height, and reserves bottom padding for fixed actions. The window callback is restored when the last control detaches; activity-hosted TrueSheet is supported. Separate Android Dialog windows require their own router attachment.

iOS attaches to the existing UIScrollView pan recognizer and observes its native bounce. It does not replace the delegate. UIKit's activity indicator is used; standard UIRefreshControl cannot be installed at the bottom. No React-drawn progress indicator is involved.

Native events: `onLoad` once per released/armed gesture, `onPull` for the footer announcement only. React owns the promise, generation isolation, and controlled loading state. Both sides have a 12 s visual timeout; this does not cancel a network request. New items append without offset compensation or automatic scrolling.

Validation surface: `joutio://catalog/native-load-more` (normal, slow, error, local, terminal page). Verify the same anchor row before/after, release below threshold, repeated pulls, scrolling upward during a request, close/reopen and tap-to-retry. Android is buildable on Linux; iOS requires Xcode and must be validated separately.

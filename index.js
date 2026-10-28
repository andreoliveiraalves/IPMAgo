/**
 * App entry point.
 *
 * The widget task handler has to be registered before the router mounts:
 * Android wakes this bundle in a headless JS context to refresh the
 * home-screen widget, and no route is ever rendered there.
 */
import './src/widgets/register';
import 'expo-router/entry';

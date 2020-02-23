use Mix.Config

# Configure your database
config :fr_phx, FrPhx.Repo,
  username: "postgres",
  password: "postgres",
  database: "fr_phx_test",
  hostname: "localhost",
  pool: Ecto.Adapters.SQL.Sandbox

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :fr_phx, FrPhxWeb.Endpoint,
  http: [port: 4002],
  server: false

# Print only warnings and errors during test
config :logger, level: :warn

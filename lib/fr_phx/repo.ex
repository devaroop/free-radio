defmodule FrPhx.Repo do
  use Ecto.Repo,
    otp_app: :fr_phx,
    adapter: Ecto.Adapters.Postgres
end

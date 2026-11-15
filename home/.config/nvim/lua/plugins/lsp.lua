return {
  {
    'mason-org/mason-lspconfig.nvim',
    dependencies = {
      'mason-org/mason.nvim',
      'neovim/nvim-lspconfig',
      'saghen/blink.cmp',
    },
    opts = {
      ensure_installed = { 'pyright', 'ts_ls' },
    },
    config = function(_, opts)
      require('mason-lspconfig').setup(opts)
      vim.lsp.enable({ 'rust_analyzer', 'sourcekit' })
    end,
  },
}
